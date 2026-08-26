"""
Application Queue Service

Orchestrates batch job application processing with:
- Async queue management
- Rate limiting per portal type
- Retry logic with exponential backoff
- Progress tracking and status updates
- Integration with Playwright and LLM services
"""

import asyncio
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from enum import Enum
import uuid


class ApplicationStatus(str, Enum):
    """Application processing statuses"""
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    SUBMITTED = "SUBMITTED"
    FAILED = "FAILED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    MANUAL_REQUIRED = "MANUAL_REQUIRED"
    SKIPPED = "SKIPPED"


class BatchStatus(str, Enum):
    """Batch processing statuses"""
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class ApplicationQueueService:
    """
    Manages the queue for bulk job application automation.
    Orchestrates Playwright automation, LLM mapping, and database updates.
    """

    def __init__(
        self,
        playwright_service=None,
        form_mapping_service=None,
        cache_service=None,
        batch_repository=None,
        application_repository=None,
        job_repository=None,
        user_profile_repository=None
    ):
        """
        Initialize ApplicationQueueService.

        Args:
            playwright_service: PlaywrightAutomationService instance
            form_mapping_service: FormMappingService instance
            cache_service: PortalMappingCacheService instance
            batch_repository: BatchRepository for batch operations
            application_repository: ApplicationV2Repository for application operations
            job_repository: JobRepository for job data
            user_profile_repository: UserProfileRepository for candidate data
        """
        self.playwright_service = playwright_service
        self.form_mapping_service = form_mapping_service
        self.cache_service = cache_service
        self.batch_repository = batch_repository
        self.application_repository = application_repository
        self.job_repository = job_repository
        self.user_profile_repository = user_profile_repository

        # Auto-initialize services if not provided
        if self.playwright_service is None:
            from backend.python.services.playwright_automation_service import get_playwright_service
            self.playwright_service = get_playwright_service()

        if self.cache_service is None:
            from backend.python.services.portal_mapping_cache_service import get_portal_mapping_cache_service
            self.cache_service = get_portal_mapping_cache_service()

        if self.form_mapping_service is None:
            from backend.python.services.form_mapping_service import get_form_mapping_service
            self.form_mapping_service = get_form_mapping_service(cache_service=self.cache_service)

        # Import repositories if not provided
        if self.batch_repository is None:
            from backend.python.repositories.batch_repository import batch_repository
            self.batch_repository = batch_repository

        if self.application_repository is None:
            from backend.python.repositories.application_v2_repository import application_v2_repository
            self.application_repository = application_v2_repository

        if self.job_repository is None:
            from backend.python.repositories.job_repository import job_repository
            self.job_repository = job_repository

        # Queue management
        self.active_batches: Dict[str, Dict[str, Any]] = {}
        self.queue: asyncio.Queue = asyncio.Queue()
        self.processing = False
        self.worker_task: Optional[asyncio.Task] = None

        # Rate limiting per portal type (seconds between requests)
        self.rate_limits = {
            'greenhouse': 30,
            'lever': 20,
            'workday': 60,
            'ashby': 25,
            'recruitee': 30,
            'custom': 30
        }
        self.last_request_time: Dict[str, datetime] = {}

        # Retry configuration
        self.max_retries = 3
        self.retry_delays = [30, 60, 120]  # Exponential backoff in seconds

    async def create_batch(
        self,
        job_ids: List[str],
        user_profile_id: str,
        resume_version_id: Optional[str] = None,
        auto_submit: bool = False,
        rate_limit_seconds: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Create a new application batch.

        Args:
            job_ids: List of job UUIDs to apply to
            user_profile_id: User profile UUID
            resume_version_id: Optional specific resume version
            auto_submit: If True, auto-submit without review
            rate_limit_seconds: Override default rate limit

        Returns:
            Batch metadata dictionary
        """
        # Validate jobs exist
        jobs = []
        for job_id in job_ids:
            job = self.job_repository.get_job_by_id(job_id) if self.job_repository else None
            if job:
                jobs.append(job)

        if not jobs:
            raise ValueError("No valid jobs found for the provided job IDs")

        # Create batch record in database
        batch_record = self.batch_repository.create_batch(
            user_profile_id=user_profile_id,
            total_count=len(jobs),
            job_ids=[str(job['id']) for job in jobs],
            resume_version_id=resume_version_id,
            auto_submit=auto_submit,
            rate_limit_seconds=rate_limit_seconds or 30
        )
        batch_id = batch_record['id']

        # Create application records for each job
        for job in jobs:
            self.application_repository.create_application(
                job_id=str(job['id']),
                user_profile_id=user_profile_id,
                batch_id=batch_id,
                resume_version_id=resume_version_id
            )

        # Store batch metadata in memory for processing
        self.active_batches[batch_id] = {
            'id': batch_id,
            'user_profile_id': user_profile_id,
            'job_ids': job_ids,
            'total_count': len(jobs),
            'rate_limit_seconds': rate_limit_seconds or 30,
            'auto_submit': auto_submit,
            'status': BatchStatus.QUEUED
        }

        print(f"[QUEUE] Created batch {batch_id} with {len(jobs)} jobs")

        return {
            'batch_id': batch_id,
            'total_count': len(jobs),
            'status': BatchStatus.QUEUED,
            'estimated_duration_minutes': len(jobs) * 2  # Rough estimate
        }

    async def start_batch_processing(
        self,
        batch_id: str,
        user_profile_id: str,
        headless: bool = False
    ) -> bool:
        """
        Start processing a batch.

        Args:
            batch_id: Batch UUID
            user_profile_id: User profile UUID for candidate data
            headless: If False, launches visible Chromium window

        Returns:
            True if started successfully
        """
        # Get batch from database
        batch = self.batch_repository.get_batch(batch_id)
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")

        if batch['status'] == 'CANCELLED':
            print(f"[QUEUE] Batch {batch_id} was already CANCELLED. Skipping execution.")
            return False

        if batch['status'] not in ['QUEUED', 'PROCESSING']:
            raise ValueError(f"Batch {batch_id} is in {batch['status']} state and cannot be processed")

        # Fetch candidate profile data
        candidate_data = await self._get_candidate_data(user_profile_id)

        # Double check batch has not been cancelled during candidate data retrieval
        fresh_batch = self.batch_repository.get_batch(batch_id)
        if fresh_batch and fresh_batch.get('status') == 'CANCELLED':
            print(f"[QUEUE] Batch {batch_id} was cancelled before worker dispatch.")
            return False

        # Update batch status to PROCESSING
        self.batch_repository.update_batch_status(
            batch_id=batch_id,
            status='PROCESSING',
            started_at=datetime.utcnow().isoformat()
        )

        # Get all queued applications for this batch
        applications = self.application_repository.get_queued_applications(batch_id)

        # Add applications to processing queue
        for app in applications:
            # Get job details
            job = self.job_repository.get_job_by_id(app['job_id'])
            if job:
                await self.queue.put({
                    'batch_id': batch_id,
                    'application': app,
                    'job': job,
                    'candidate_data': candidate_data,
                    'headless': headless
                })

        # Start worker if not already running
        if not self.processing:
            await self._start_worker()

        print(f"[QUEUE] Started processing batch {batch_id} with {len(applications)} applications (headless={headless})")
        return True

    async def _start_worker(self) -> None:
        """Start the background worker task."""
        if self.worker_task and not self.worker_task.done():
            return

        self.processing = True
        self.worker_task = asyncio.create_task(self._process_queue())
        print("[QUEUE] Worker started")

    async def _process_queue(self) -> None:
        """
        Background worker that processes queued applications.
        Runs continuously until queue is empty.
        """
        try:
            while self.processing or not self.queue.empty():
                try:
                    # Get next application from queue (timeout to allow checking processing flag)
                    item = await asyncio.wait_for(self.queue.get(), timeout=5.0)

                    # Check if batch was cancelled before processing
                    current_batch = self.batch_repository.get_batch(item['batch_id'])
                    if current_batch and current_batch.get('status') == 'CANCELLED':
                        self.application_repository.update_application(
                            app_id=item['application']['id'],
                            status='SKIPPED',
                            progress_message='Batch was cancelled by user'
                        )
                        self.queue.task_done()
                        continue

                    # Process the application
                    await self._process_application(
                        batch_id=item['batch_id'],
                        application=item['application'],
                        candidate_data=item['candidate_data'],
                        headless=item.get('headless', False)
                    )

                    self.queue.task_done()

                except asyncio.TimeoutError:
                    # No items in queue, check if we should stop
                    if self.queue.empty() and not self.processing:
                        break
                    continue

        except Exception as e:
            print(f"[QUEUE] Worker error: {str(e)}")
        finally:
            self.processing = False
            print("[QUEUE] Worker stopped")

    async def _process_application(
        self,
        batch_id: str,
        application: Dict[str, Any],
        candidate_data: Dict[str, Any],
        headless: bool = False
    ) -> None:
        """
        Process a single application.

        Args:
            batch_id: Batch UUID
            application: Application data
            candidate_data: Candidate profile data
            headless: Whether to run Playwright headlessly
        """
        app_id = application['id']
        job_id = application['job_id']
        job = application.get('job') or self.job_repository.get_job_by_id(job_id)
        apply_url = job.get('apply_link') or job.get('apply_url', '')
        portal_type = job.get('portal_type', 'custom')

        print(f"[QUEUE] Processing application {app_id} for job {job_id}")

        # Check if batch was cancelled
        current_batch = self.batch_repository.get_batch(batch_id)
        if current_batch and current_batch.get('status') == 'CANCELLED':
            print(f"[QUEUE] Application {app_id} skipped because batch {batch_id} was cancelled.")
            return

        # Update application status to PROCESSING
        self.application_repository.update_application(
            app_id=app_id,
            status='PROCESSING',
            progress_message='Launching browser...'
        )

        try:
            # Enforce rate limiting
            await self._enforce_rate_limit(portal_type)

            # Initialize Playwright with requested headless mode
            if not self.playwright_service:
                raise Exception("Playwright service not initialized")

            await self.playwright_service.initialize(headless=headless)

            # Navigate to job application page
            self.application_repository.update_application(
                app_id=app_id,
                progress_message='Loading application page...'
            )
            page, success = await self.playwright_service.navigate_to_job(apply_url)

            if not success:
                raise Exception(f"Failed to navigate to {apply_url}")

            # Check for login wall or CAPTCHA
            has_captcha = await self.playwright_service.detect_captcha(page)
            has_login = await self.playwright_service.detect_login_wall(page)

            if has_captcha:
                await self._handle_captcha(app_id, page)
                await self.playwright_service.close_page(page)
                return

            if has_login:
                await self._handle_login_wall(app_id, page)
                await self.playwright_service.close_page(page)
                return

            # Identify portal type
            self.application_repository.update_application(
                app_id=app_id,
                progress_message='Analyzing form...'
            )
            detected_portal = await self.playwright_service.identify_portal_type(page)
            company_slug = job.get('company', 'unknown').lower().replace(' ', '-')
            portal_identifier = f"{detected_portal}:{company_slug}"

            # Extract form structure
            form_structure = await self.playwright_service.extract_form_structure(page)

            # If no inputs found, attempt to click Apply / Apply Now CTA
            if form_structure.get('field_count', 0) == 0:
                self.application_repository.update_application(
                    app_id=app_id,
                    progress_message='Locating Apply application button...'
                )
                opened = await self.playwright_service.find_and_open_application_form(page)
                if opened:
                    form_structure = await self.playwright_service.extract_form_structure(page)

            # If still no inputs found or page is an external redirect / login required
            if form_structure.get('field_count', 0) == 0:
                screenshot = await self.playwright_service.capture_screenshot(page)
                self.application_repository.update_application(
                    app_id=app_id,
                    status='MANUAL_REQUIRED',
                    progress_message='External portal requires manual review or login',
                    screenshot_url=screenshot
                )
                print(f"[QUEUE] Application {app_id} marked as MANUAL_REQUIRED (no direct form fields detected)")
                await self.playwright_service.close_page(page)
                return

            # Get or generate field mapping
            self.application_repository.update_application(
                app_id=app_id,
                progress_message='Mapping form fields...'
            )
            candidate_fields = list(candidate_data.keys())

            if self.form_mapping_service:
                mapping = await self.form_mapping_service.get_or_create_mapping(
                    portal_identifier=portal_identifier,
                    portal_type=detected_portal,
                    form_structure=form_structure,
                    candidate_fields=candidate_fields
                )
            else:
                raise Exception("Form mapping service not initialized")

            # Validate mapping
            is_valid, missing = await self.form_mapping_service.validate_mapping(page, mapping)

            if not is_valid and len(missing) > len(mapping) * 0.5:
                # More than 50% of fields missing - form changed
                self.application_repository.update_application(
                    app_id=app_id,
                    progress_message='Form structure changed, regenerating mapping...'
                )
                if self.cache_service:
                    await self.cache_service.deprecate_mapping(
                        portal_identifier,
                        reason="Validation failed: too many missing selectors"
                    )
                # Regenerate
                mapping = await self.form_mapping_service.generate_mapping_via_llm(
                    form_structure=form_structure,
                    candidate_fields=candidate_fields,
                    portal_type=detected_portal
                )

            # Fill form
            self.application_repository.update_application(
                app_id=app_id,
                progress_message='Filling form fields...'
            )
            success, errors = await self.playwright_service.fill_form(
                page=page,
                field_mapping=mapping,
                candidate_data=candidate_data
            )

            if not success:
                raise Exception(f"Form filling failed: {', '.join(errors[:3])}")

            # Upload resume if available
            if 'resume' in mapping and candidate_data.get('resume_path'):
                self.application_repository.update_application(
                    app_id=app_id,
                    progress_message='Uploading resume...'
                )
                resume_success, resume_error = await self.playwright_service.upload_file(
                    page=page,
                    file_selector=mapping['resume'],
                    file_path=candidate_data['resume_path']
                )
                if not resume_success:
                    print(f"[QUEUE] Resume upload warning: {resume_error}")

            # Take pre-submit screenshot
            screenshot_success, screenshot_b64 = await self.playwright_service.take_screenshot(
                page=page,
                screenshot_type='pre_submit'
            )

            # Check if auto-submit or needs review
            batch = self.batch_repository.get_batch(batch_id)
            if batch and not batch.get('auto_submit'):
                # First-time portal or user wants review
                if self.cache_service:
                    cached = await self.cache_service.get_cached_mapping(portal_identifier)
                    if not cached or cached.get('validation_status') == 'UNVALIDATED':
                        await self._handle_needs_review(app_id, page, mapping, screenshot_b64)
                        await self.playwright_service.close_page(page)
                        return

            # Submit form
            self.application_repository.update_application(
                app_id=app_id,
                progress_message='Submitting application...'
            )
            submit_success, submit_message = await self.playwright_service.submit_form(page)

            # Take post-submit screenshot
            screenshot_success, screenshot_b64_post = await self.playwright_service.take_screenshot(
                page=page,
                screenshot_type='success' if submit_success else 'error'
            )

            # Update status
            if submit_success:
                now = datetime.utcnow().isoformat()
                self.application_repository.update_application(
                    app_id=app_id,
                    status='SUBMITTED',
                    progress_message='Successfully submitted!',
                    submitted_at=now,
                    screenshot_url=f"data:image/png;base64,{screenshot_b64_post[:200]}..." if screenshot_b64_post else None
                )
                # Synchronize main job repository status to APPLIED
                try:
                    self.job_repository.update_job_status(job_id, 'APPLIED')
                except Exception as db_err:
                    print(f"[QUEUE] Warning updating job repository: {db_err}")

                # Update cache statistics
                if self.cache_service:
                    await self.cache_service.update_success_count(portal_identifier)

                print(f"[QUEUE] [OK] Application {app_id} submitted successfully and job {job_id} marked as APPLIED")
            else:
                raise Exception(f"Submission failed: {submit_message}")

            # Close page
            await self.playwright_service.close_page(page)

        except Exception as e:
            error_msg = str(e)
            print(f"[QUEUE] [FAILED] Application {app_id} failed: {error_msg}")

            # Take error screenshot if page exists
            screenshot_b64_error = None
            try:
                if 'page' in locals():
                    screenshot_success, screenshot_b64_error = await self.playwright_service.take_screenshot(
                        page=page,
                        screenshot_type='error'
                    )
                    await self.playwright_service.close_page(page)
            except:
                pass

            # Get current retry count
            app_record = self.application_repository.get_application(app_id)
            retry_count = app_record.get('automation_metadata', {}).get('retry_count', 0) if app_record else 0

            # Check if should retry
            if retry_count < self.max_retries:
                await self._retry_application(batch_id, app_id, candidate_data, error_msg, retry_count, headless)
            else:
                self.application_repository.update_application(
                    app_id=app_id,
                    status='FAILED',
                    progress_message=f'Failed after {self.max_retries} retries',
                    error_message=error_msg,
                    screenshot_url=f"data:image/png;base64,{screenshot_b64_error[:200]}..." if screenshot_b64_error else None
                )

                # Update cache statistics
                company_slug = job.get('company', 'unknown').lower().replace(' ', '-')
                portal_identifier = f"{portal_type}:{company_slug}"
                if self.cache_service:
                    await self.cache_service.update_failure_count(portal_identifier)

        finally:
            # Update batch counters in database
            await self._update_batch_counters(batch_id)

    async def _enforce_rate_limit(self, portal_type: str) -> None:
        """
        Enforce rate limiting for portal type.

        Args:
            portal_type: Portal type identifier
        """
        rate_limit = self.rate_limits.get(portal_type, 30)
        last_request = self.last_request_time.get(portal_type)

        if last_request:
            elapsed = (datetime.utcnow() - last_request).total_seconds()
            if elapsed < rate_limit:
                wait_time = rate_limit - elapsed
                print(f"[QUEUE] Rate limit: waiting {wait_time:.1f}s for {portal_type}")
                await asyncio.sleep(wait_time)

        self.last_request_time[portal_type] = datetime.utcnow()

    async def _handle_captcha(self, app_id: str, page: Any) -> None:
        """Handle CAPTCHA detection."""
        print(f"[QUEUE] [CAPTCHA] CAPTCHA detected for application {app_id}")

        screenshot_success, screenshot_b64 = await self.playwright_service.take_screenshot(
            page=page,
            screenshot_type='captcha'
        )

        self.application_repository.update_application(
            app_id=app_id,
            status='NEEDS_REVIEW',
            progress_message='CAPTCHA detected - manual review required',
            screenshot_url=f"data:image/png;base64,{screenshot_b64[:200]}..." if screenshot_b64 else None,
            manual_reason='CAPTCHA detected on portal'
        )

    async def _handle_login_wall(self, app_id: str, page: Any) -> None:
        """Handle login wall detection."""
        print(f"[QUEUE] [LOGIN] Login required for application {app_id}")

        screenshot_success, screenshot_b64 = await self.playwright_service.take_screenshot(
            page=page,
            screenshot_type='login_wall'
        )

        self.application_repository.update_application(
            app_id=app_id,
            status='NEEDS_REVIEW',
            progress_message='Login required - manual review required',
            screenshot_url=f"data:image/png;base64,{screenshot_b64[:200]}..." if screenshot_b64 else None,
            manual_reason='Login wall encountered'
        )

    async def _handle_needs_review(
        self,
        app_id: str,
        page: Any,
        mapping: Dict[str, str],
        screenshot_b64: Optional[str] = None
    ) -> None:
        """Handle first-time portal requiring human review."""
        print(f"[QUEUE] [REVIEW] First-time portal for application {app_id} - needs review")

        if not screenshot_b64:
            screenshot_success, screenshot_b64 = await self.playwright_service.take_screenshot(
                page=page,
                screenshot_type='pre_submit'
            )

        self.application_repository.update_application(
            app_id=app_id,
            status='NEEDS_REVIEW',
            progress_message='New portal - review before submit',
            screenshot_url=f"data:image/png;base64,{screenshot_b64[:200]}..." if screenshot_b64 else None,
            manual_reason='First-time portal structure verification'
        )

    async def _retry_application(
        self,
        batch_id: str,
        app_id: str,
        candidate_data: Dict[str, Any],
        error_msg: str,
        retry_count: int,
        headless: bool = False
    ) -> None:
        """
        Retry a failed application with exponential backoff.

        Args:
            batch_id: Batch UUID
            app_id: Application UUID
            candidate_data: Candidate profile data
            error_msg: Error message from previous attempt
            retry_count: Current retry count
            headless: Headless browser flag
        """
        delay = self.retry_delays[min(retry_count, len(self.retry_delays) - 1)]
        print(f"[QUEUE] Retrying application {app_id} in {delay}s (attempt {retry_count + 1}/{self.max_retries})")

        self.application_repository.update_application(
            app_id=app_id,
            status='QUEUED',
            progress_message=f'Retrying in {delay}s... (attempt {retry_count + 1})',
            error_message=error_msg,
            automation_metadata={
                'retry_count': retry_count + 1,
                'last_error': error_msg
            }
        )

        # Check if batch was cancelled before waiting
        current_batch = self.batch_repository.get_batch(batch_id)
        if current_batch and current_batch.get('status') == 'CANCELLED':
            print(f"[QUEUE] Application {app_id} retry aborted because batch was cancelled.")
            return

        # Wait before retrying
        await asyncio.sleep(delay)

        # Check again after sleep
        current_batch = self.batch_repository.get_batch(batch_id)
        if current_batch and current_batch.get('status') == 'CANCELLED':
            print(f"[QUEUE] Application {app_id} retry aborted because batch was cancelled.")
            return

        # Re-queue
        app_record = self.application_repository.get_application(app_id)
        if app_record:
            job = self.job_repository.get_job_by_id(app_record['job_id'])
            await self.queue.put({
                'batch_id': batch_id,
                'application': app_record,
                'job': job,
                'candidate_data': candidate_data,
                'headless': headless
            })

    async def _update_batch_counters(self, batch_id: str) -> None:
        """Update batch completion counters directly from database records."""
        apps = self.application_repository.get_batch_applications(batch_id)
        if not apps:
            return

        total = len(apps)
        completed = sum(1 for app in apps if app.get('status') in ['SUBMITTED', 'FAILED', 'NEEDS_REVIEW', 'MANUAL_REQUIRED', 'SKIPPED'])
        success = sum(1 for app in apps if app.get('status') == 'SUBMITTED')
        failed = sum(1 for app in apps if app.get('status') == 'FAILED')
        needs_review = sum(1 for app in apps if app.get('status') in ['NEEDS_REVIEW', 'MANUAL_REQUIRED'])

        # Check memory and DB for cancellation
        in_memory_batch = self.active_batches.get(batch_id, {})
        current_batch = self.batch_repository.get_batch(batch_id)
        is_cancelled = (in_memory_batch.get('status') == BatchStatus.CANCELLED) or (current_batch and current_batch.get('status') == 'CANCELLED')

        if is_cancelled:
            status = 'CANCELLED'
        elif completed >= total:
            status = 'COMPLETED'
        else:
            status = 'PROCESSING'

        completed_at = datetime.utcnow().isoformat() if (completed >= total or status == 'CANCELLED') else None

        self.batch_repository.update_batch_counters(
            batch_id=batch_id,
            completed_count=completed,
            success_count=success,
            failed_count=failed,
            needs_review_count=needs_review,
            status=status,
            completed_at=completed_at
        )

        if status in ['COMPLETED', 'CANCELLED']:
            print(f"[QUEUE] [DONE] Batch {batch_id} {status.lower()}: {success} success, {failed} failed, {needs_review} need review")

    async def _get_candidate_data(self, user_profile_id: str) -> Dict[str, Any]:
        """
        Fetch candidate profile data from truth store.

        Args:
            user_profile_id: User profile UUID

        Returns:
            Candidate data dictionary
        """
        from pathlib import Path
        from backend.python.services.candidate_profile_service import candidate_profile_service

        try:
            cand = candidate_profile_service.get_candidate_data()
        except Exception:
            cand = {}

        # Resolve verified local resume PDF
        project_root = Path(__file__).resolve().parents[3]
        resume_candidates = [
            project_root / "public" / "downloads" / "Sathyanantham_V_Resume.pdf",
            project_root / "public" / "resume.pdf",
            project_root / "public" / "downloads" / "Sathyanantham_V_AI_FullStack_Lead.pdf",
        ]
        resolved_resume = None
        for r in resume_candidates:
            if r.exists():
                resolved_resume = str(r.resolve())
                break

        full_name = cand.get('name') or 'Sathyanantham V'
        parts = full_name.split()
        first_name = parts[0] if parts else 'Sathyanantham'
        last_name = " ".join(parts[1:]) if len(parts) > 1 else 'V'

        return {
            'full_name': full_name,
            'first_name': first_name,
            'last_name': last_name,
            'email': cand.get('email') or 'v.sathyanantham@gmail.com',
            'phone': cand.get('phone') or '+91 8870956756',
            'location': cand.get('location') or 'Coimbatore, Tamil Nadu, India',
            'linkedin': cand.get('linkedin_url') or 'https://www.linkedin.com/in/sathyanantham-v-646b911b',
            'github': cand.get('github_url') or 'https://github.com/sakthipet11',
            'portfolio_url': cand.get('portfolio_url') or 'https://sathyanantham-portfolio-tv.vercel.app',
            'years_of_experience': cand.get('years_experience') or '13',
            'current_company': 'Lead Frontend Architect',
            'work_authorization': cand.get('work_authorization') or 'Authorized to work in India; Open to Remote & Relocation',
            'primary_skills': cand.get('skills') or ['React', 'TypeScript', 'Next.js', 'AI'],
            'resume_path': resolved_resume
        }

    async def get_batch_status(self, batch_id: str) -> Optional[Dict[str, Any]]:
        """
        Get current batch status.

        Args:
            batch_id: Batch UUID

        Returns:
            Batch status dictionary
        """
        # Get batch from database
        batch = self.batch_repository.get_batch(batch_id)
        if not batch:
            return None

        # Get applications with job details
        applications = self.batch_repository.get_batch_applications(batch_id)

        return {
            'batch_id': batch_id,
            'status': batch['status'],
            'total_count': batch['total_count'],
            'completed_count': batch['completed_count'],
            'success_count': batch['success_count'],
            'failed_count': batch['failed_count'],
            'needs_review_count': batch['needs_review_count'],
            'started_at': batch.get('started_at'),
            'completed_at': batch.get('completed_at'),
            'applications': applications
        }

    def _get_screenshot_url(self, app: Dict[str, Any]) -> Optional[str]:
        """Get screenshot URL based on application status."""
        if app['status'] == ApplicationStatus.SUBMITTED and app.get('screenshot_post_submit'):
            return f"data:image/png;base64,{app['screenshot_post_submit'][:100]}..."  # Truncate for response
        elif app['status'] == ApplicationStatus.FAILED and app.get('screenshot_error'):
            return f"data:image/png;base64,{app['screenshot_error'][:100]}..."
        elif app.get('screenshot_captcha'):
            return f"data:image/png;base64,{app['screenshot_captcha'][:100]}..."
        return None

    async def cancel_batch(self, batch_id: str) -> bool:
        """
        Cancel a batch.

        Args:
            batch_id: Batch UUID

        Returns:
            True if cancelled successfully
        """
        if self.active_batches.get(batch_id):
            self.active_batches[batch_id]['status'] = BatchStatus.CANCELLED

        success = self.batch_repository.cancel_batch(batch_id)
        print(f"[QUEUE] Batch {batch_id} cancelled (db_success={success})")
        return success

    async def stop_processing(self) -> None:
        """Stop the queue worker gracefully."""
        self.processing = False
        if self.worker_task:
            await self.worker_task
        print("[QUEUE] Processing stopped")

    async def cleanup(self) -> None:
        """Clean up resources."""
        await self.stop_processing()
        if self.playwright_service:
            await self.playwright_service.cleanup()


# Singleton instance
_queue_service: Optional[ApplicationQueueService] = None


def get_application_queue_service(
    playwright_service=None,
    form_mapping_service=None,
    cache_service=None,
    application_repository=None,
    job_repository=None,
    user_profile_repository=None
) -> ApplicationQueueService:
    """
    Get singleton instance of ApplicationQueueService.

    Returns:
        ApplicationQueueService instance
    """
    global _queue_service
    if _queue_service is None:
        _queue_service = ApplicationQueueService(
            playwright_service=playwright_service,
            form_mapping_service=form_mapping_service,
            cache_service=cache_service,
            application_repository=application_repository,
            job_repository=job_repository,
            user_profile_repository=user_profile_repository
        )
    return _queue_service
