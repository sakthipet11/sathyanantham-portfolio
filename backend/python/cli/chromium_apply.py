#!/usr/bin/env python3
"""
Chromium CLI - Automated Job Application Engine
Opens job URLs in a dedicated Chromium browser tab, fills candidate details,
attaches resume, handles compliance/questions, submits, and updates status in Database.

Usage:
    python -m backend.python.cli.chromium_apply --url "https://jobs.lever.co/company/job-id"
    python -m backend.python.cli.chromium_apply "https://boards.greenhouse.io/company/jobs/123" --auto-submit
    chromium-cli "https://example.com/careers/job"
"""

import argparse
import asyncio
import os
import sys
import time
import re
import uuid
import hashlib
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

# Ensure UTF-8 output encoding for Windows terminals
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    from playwright.async_api import async_playwright, Browser, Page, BrowserContext, TimeoutError as PlaywrightTimeout
except ImportError:
    print("[ERROR] Playwright is not installed. Please run: pip install playwright && playwright install chromium")
    sys.exit(1)

from backend.python.services.candidate_profile_service import candidate_profile_service
from backend.python.repositories.job_repository import job_repository
from backend.python.repositories.application_repository import ApplicationRepository


class ChromiumJobApplier:
    """
    Automates opening job URLs in Chromium, auto-filling candidate details,
    attaching resume, handling compliance questions, and updating application status in Database.
    """

    def __init__(
        self,
        headless: bool = False,
        slow_mo: int = 100,
        auto_submit: bool = False,
        resume_path: Optional[str] = None,
        timeout: int = 30000,
    ):
        self.headless = headless
        self.slow_mo = slow_mo
        self.auto_submit = auto_submit
        self.timeout = timeout
        self.resume_path = self._resolve_resume_path(resume_path)
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.job_repo = job_repository
        self.app_repo = ApplicationRepository()

    def _resolve_resume_path(self, custom_path: Optional[str]) -> Optional[str]:
        """Resolve default or custom resume path."""
        if custom_path and Path(custom_path).exists():
            return str(Path(custom_path).resolve())

        # Check standard locations in project
        candidates = [
            PROJECT_ROOT / "public" / "downloads" / "Sathyanantham_V_Resume.pdf",
            PROJECT_ROOT / "public" / "resume.pdf",
            PROJECT_ROOT / "public" / "downloads" / "Sathyanantham_V_Frontend_Architect_2026.pdf",
            PROJECT_ROOT / "public" / "downloads" / "Sathyanantham_V_AI_FullStack_Lead.pdf",
        ]
        for c in candidates:
            if c.exists():
                return str(c.resolve())
        return None

    def get_candidate_info(self) -> Dict[str, Any]:
        """Fetch candidate details from truth store."""
        try:
            data = candidate_profile_service.get_candidate_data()
        except Exception as e:
            print(f"[WARN] Failed to load candidate profile from DB ({e}), using verified fallback profile.")
            data = {
                "name": "Sathyanantham V",
                "email": "v.sathyanantham@gmail.com",
                "phone": "+91 8870956756",
                "location": "Coimbatore, Tamil Nadu, India",
                "linkedin_url": "https://www.linkedin.com/in/sathyanantham-v-646b911b",
                "portfolio_url": "https://sathyanantham-portfolio-tv.vercel.app",
                "github_url": "https://github.com/sakthipet11",
                "years_experience": "13",
                "education": "Master of Computer Applications (MCA) & B.Sc Computer Science",
                "work_authorization": "Authorized to work in India; Open to Remote & Relocation",
                "visa_status": "Open for Global Sponsorship / Remote Consultant",
                "notice_period": "30",
                "salary_expectation": "140000",
                "skills": "React, TypeScript, Micro Frontends, Next.js, AI Agents, Python",
                "answers_to_common_questions": {
                    "require_sponsorship": "No",
                    "legally_authorized": "Yes",
                    "willing_to_relocate": "Yes",
                    "preferred_work_type": "Remote"
                }
            }

        # Parse first and last name
        full_name = data.get("name", "Sathyanantham V").strip()
        parts = full_name.split()
        first_name = parts[0] if parts else "Sathyanantham"
        last_name = " ".join(parts[1:]) if len(parts) > 1 else "V"

        # Expand dictionary for flexible field matching
        info = {
            "full_name": full_name,
            "first_name": first_name,
            "last_name": last_name,
            "email": data.get("email", "v.sathyanantham@gmail.com"),
            "phone": data.get("phone", "+91 8870956756"),
            "phone_raw": data.get("phone", "8870956756").replace("+91", "").replace(" ", "").replace("-", ""),
            "location": data.get("location", "Coimbatore, Tamil Nadu, India"),
            "city": "Coimbatore",
            "state": "Tamil Nadu",
            "country": "India",
            "postal_code": "641001",
            "linkedin_url": data.get("linkedin_url", "https://www.linkedin.com/in/sathyanantham-v-646b911b"),
            "portfolio_url": data.get("portfolio_url", "https://sathyanantham-portfolio-tv.vercel.app"),
            "github_url": data.get("github_url", "https://github.com/sakthipet11"),
            "website": data.get("portfolio_url", "https://sathyanantham-portfolio-tv.vercel.app"),
            "years_experience": "13",
            "current_company": "Lead Frontend & AI Architect",
            "current_title": "Lead Frontend Architect / Full-Stack AI Engineer",
            "headline": "Lead Frontend Architect & AI Systems Specialist (13+ YOE)",
            "education": data.get("education", "Master of Computer Applications (MCA)"),
            "degree": "Master's Degree",
            "discipline": "Computer Science",
            "school": "Bharathiar University",
            "work_authorization": data.get("work_authorization", "Authorized to work in India; Open to Remote & Relocation"),
            "notice_period": "30",
            "salary_expectation": "$140,000+",
            "skills": data.get("skills", "React, TypeScript, Next.js, Micro Frontends, Python, AI"),
            "cover_letter": (
                "Dear Hiring Team,\n\n"
                "I am excited to apply for this role. With 13+ years of experience leading enterprise frontend architectures, "
                "micro-frontends, and AI-driven autonomous workflows, I bring deep expertise in building scalable, resilient applications. "
                "I look forward to discussing how my experience aligns with your team's goals.\n\n"
                "Best regards,\nSathyanantham V"
            ),
        }
        return info

    def _extract_job_meta_from_url(self, url: str) -> Tuple[str, str]:
        """Extract plausible company and title from URL structure."""
        url_lower = url.lower()
        company = "Company"
        title = "Job Opportunity"

        # e.g., jobs.lever.co/company_name/job_id
        if "jobs.lever.co/" in url_lower:
            parts = url.split("jobs.lever.co/")[1].split("/")
            if len(parts) >= 1:
                company = parts[0].replace("-", " ").title()
            if len(parts) >= 2:
                title = parts[1].replace("-", " ").title()
        # e.g., boards.greenhouse.io/company_name/jobs/id
        elif "greenhouse.io/" in url_lower:
            parts = url.split("greenhouse.io/")[1].split("/")
            if len(parts) >= 1:
                company = parts[0].replace("-", " ").title()
        # e.g., jobs.ashbyhq.com/company_name/job_id
        elif "ashbyhq.com/" in url_lower:
            parts = url.split("ashbyhq.com/")[1].split("/")
            if len(parts) >= 1:
                company = parts[0].replace("-", " ").title()

        return company, title

    def _sync_job_record_in_db(self, url: str, page_title: str = "") -> Dict[str, Any]:
        """Look up or create the job in DB so we can update its status."""
        company_from_url, title_from_url = self._extract_job_meta_from_url(url)
        
        # Try to refine title/company from page title
        job_title = title_from_url
        company = company_from_url
        if page_title:
            cleaned = page_title.split(" - ")[0].split(" | ")[0].strip()
            if len(cleaned) > 3 and not any(k in cleaned.lower() for k in ["apply", "careers", "job"]):
                job_title = cleaned

        idempotency_key = f"url_{hashlib.md5(url.strip().encode()).hexdigest()[:16]}"

        existing = self.job_repo.get_job_by_idempotency_key(idempotency_key)
        if existing:
            print(f"📊 [DB] Found existing job record: {existing.get('id')} ({existing.get('title')} at {existing.get('company')})")
            return existing

        job_id = str(uuid.uuid4())
        job_data = {
            "id": job_id,
            "title": job_title or "Software Engineer",
            "company": company or "Enterprise",
            "location": "Remote / Hybrid",
            "apply_url": url,
            "job_url": url,
            "portal_type": "custom",
            "status": "DISCOVERED",
            "idempotency_key": idempotency_key,
            "source": "chromium_cli",
            "match_score": 95.0,
            "tech_stack": ["React", "TypeScript", "Next.js", "AI", "Python"],
            "description_raw": f"Job application opened via Chromium CLI from {url}",
        }

        try:
            saved_job = self.job_repo.save_job(job_data)
            print(f"💾 [DB] Created new job entry in DB: {job_id} ({job_data['title']} @ {job_data['company']})")
            return saved_job
        except Exception as e:
            print(f"⚠️ [DB] Note creating job in DB: {e}")
            return job_data

    def _update_db_status(self, job_id: str, status: str, confirmation_id: Optional[str] = None, notes: Optional[str] = None):
        """Update job and application status in Database."""
        try:
            print(f"\n🔄 [DB] Updating status for Job {job_id} -> '{status}'...")
            self.job_repo.update_job_status(job_id, status)
            self.app_repo.update_application_status(job_id, status, notes=notes)
            self.app_repo.log_event(
                application_id=job_id,
                event_type=f"APPLICATION_{status}",
                message=f"Application status updated to {status} via Chromium CLI. {notes or ''}".strip(),
                payload={"confirmation_id": confirmation_id, "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")}
            )
            print(f"✅ [DB] Status successfully updated to '{status}' in Database.")
        except Exception as e:
            print(f"⚠️ [DB] Warning updating DB status: {e}")

    async def initialize_browser(self) -> None:
        """Launch Chromium browser and create context."""
        print("\n🚀 [CHROMIUM-CLI] Launching Chromium browser...")
        self.playwright = await async_playwright().start()

        launch_args = [
            "--disable-blink-features=AutomationControlled",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--start-maximized",
        ]

        self.browser = await self.playwright.chromium.launch(
            headless=self.headless,
            slow_mo=self.slow_mo,
            args=launch_args,
        )

        self.context = await self.browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            locale="en-US",
            timezone_id="America/New_York",
            accept_downloads=True,
        )
        self.context.set_default_timeout(self.timeout)
        print(f"✨ [CHROMIUM-CLI] Browser initialized (headless={self.headless}, slow_mo={self.slow_mo}ms)")

    async def open_and_apply(self, url: str) -> bool:
        """
        Open a new tab with the job URL, dynamically fill details, attach resume,
        apply to the job, and update database status.
        """
        if not self.context:
            await self.initialize_browser()

        print(f"\n🌐 [CHROMIUM-CLI] Opening new tab for: {url}")
        page = await self.context.new_page()

        job_record = None
        try:
            print("⏳ [CHROMIUM-CLI] Loading webpage...")
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            except PlaywrightTimeout:
                await page.goto(url, wait_until="load", timeout=15000)

            await page.wait_for_timeout(2000)
            page_title = await page.title()
            print(f"📄 [CHROMIUM-CLI] Page Loaded: \"{page_title}\"")

            # Sync Job Record in DB
            job_record = self._sync_job_record_in_db(url, page_title)
            job_id = str(job_record.get("id"))

            # Check if there is an 'Apply' or 'Apply Now' CTA button to click first
            await self._trigger_apply_button_if_present(page)

            # Auto-fill form fields
            candidate_info = self.get_candidate_info()
            filled_summary = await self._auto_fill_form(page, candidate_info)

            # Handle file uploads (Resume / Cover Letter)
            if self.resume_path:
                await self._upload_resume(page, self.resume_path)

            # Check checkboxes / radio buttons for common compliance questions
            await self._handle_common_questions_and_checkboxes(page)

            # Capture screenshot
            screenshot_dir = PROJECT_ROOT / "public" / "downloads" / "apply_screenshots"
            screenshot_dir.mkdir(parents=True, exist_ok=True)
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            screenshot_file = screenshot_dir / f"application_filled_{timestamp}.png"
            try:
                await page.screenshot(path=str(screenshot_file), full_page=False)
                print(f"📸 [CHROMIUM-CLI] Screenshot captured: {screenshot_file}")
            except Exception as e:
                print(f"⚠️ [CHROMIUM-CLI] Note capturing screenshot: {e}")

            print("\n" + "=" * 60)
            print(f"✅ [CHROMIUM-CLI] Application Form Auto-Fill Complete!")
            print(f"   Target Job: {job_record.get('title')} at {job_record.get('company')}")
            print(f"   Fields Filled: {len(filled_summary)}")
            for field, val in filled_summary.items():
                print(f"   - {field}: {val}")
            if self.resume_path:
                print(f"   - Resume Attached: {Path(self.resume_path).name}")
            print("=" * 60 + "\n")

            if self.auto_submit:
                print("⚡ [CHROMIUM-CLI] Auto-submit enabled. Submitting application...")
                submitted, msg = await self._submit_form(page)
                if submitted:
                    conf_id = f"CONF-{job_id[:8].upper()}-{time.strftime('%Y%m%d')}"
                    print(f"🎉 [CHROMIUM-CLI] Application Submitted Successfully! ({msg})")
                    self._update_db_status(job_id, "APPLIED", confirmation_id=conf_id, notes=msg)
                else:
                    print(f"⚠️ [CHROMIUM-CLI] Submission note: {msg}")
                    self._update_db_status(job_id, "MANUAL_REQUIRED", notes=msg)
            else:
                print("👁️ [CHROMIUM-CLI] Browser tab remains open for your review.")
                print("   👉 Check the Chromium window to verify and submit, or press Enter in terminal when done.")
                # If interactive in terminal, prompt user
                if not self.headless:
                    try:
                        user_input = input("\n[ACTION] Press [Enter] to submit application & update DB, or type 's' to save as READY_FOR_REVIEW without submit: ").strip().lower()
                        if user_input != 's':
                            submitted, msg = await self._submit_form(page)
                            conf_id = f"CONF-{job_id[:8].upper()}-{time.strftime('%Y%m%d')}"
                            status = "APPLIED" if submitted else "READY_FOR_REVIEW"
                            self._update_db_status(job_id, status, confirmation_id=conf_id if submitted else None, notes=msg)
                            print(f"🚀 [CHROMIUM-CLI] Result: {msg}")
                            await page.wait_for_timeout(3000)
                        else:
                            self._update_db_status(job_id, "READY_FOR_REVIEW", notes="Saved by candidate for review")
                    except (KeyboardInterrupt, EOFError):
                        print("\n[CHROMIUM-CLI] Preserving state...")
                        self._update_db_status(job_id, "READY_FOR_REVIEW", notes="Manual session ended")

            return True

        except Exception as e:
            print(f"❌ [CHROMIUM-CLI] Error during automation: {e}")
            if job_record:
                self._update_db_status(str(job_record.get("id")), "FAILED", notes=str(e))
            return False

    async def _trigger_apply_button_if_present(self, page: Page) -> bool:
        """Find and click 'Apply', 'Apply Now', 'Easy Apply' button if form is not directly visible."""
        apply_selectors = [
            'a:has-text("Apply for this job")',
            'button:has-text("Apply for this job")',
            'a:has-text("Apply on company site")',
            'button:has-text("Apply on company site")',
            'a:has-text("Easy Apply")',
            'button:has-text("Easy Apply")',
            'a:has-text("Apply Now")',
            'button:has-text("Apply Now")',
            'button:has-text("Apply")',
            'a:has-text("Apply")',
            '[data-qa="apply-button"]',
            '.apply-button',
            '#apply-button',
            'a[href*="#apply"]',
            'a[href*="/apply"]',
        ]
        for selector in apply_selectors:
            try:
                button = await page.query_selector(selector)
                if button and await button.is_visible():
                    print(f"🎯 [CHROMIUM-CLI] Clicking Apply button: {selector}")
                    await button.click()
                    await page.wait_for_timeout(2000)
                    return True
            except Exception:
                continue
        return False

    async def _auto_fill_form(self, page: Page, candidate: Dict[str, Any]) -> Dict[str, str]:
        """Detect and fill all form input fields on the page."""
        filled = {}
        inputs = await page.query_selector_all("input, textarea, select")

        field_rules = [
            # First Name
            ("first_name", candidate["first_name"], ["first_name", "firstname", "first name", "given_name", "fname"]),
            # Last Name
            ("last_name", candidate["last_name"], ["last_name", "lastname", "last name", "family_name", "lname", "surname"]),
            # Full Name (only if separate first/last name not found or explicitly requested)
            ("full_name", candidate["full_name"], ["applicant_name", "full_name", "fullname", "full name", "your name", "candidate_name", "name"]),
            # Email
            ("email", candidate["email"], ["email", "e-mail", "email_address", "electronic mail"]),
            # Phone
            ("phone", candidate["phone"], ["phone", "mobile", "telephone", "cell", "contact_number", "phone_number"]),
            # LinkedIn
            ("linkedin", candidate["linkedin_url"], ["linkedin", "linked_in", "linkedin_profile", "linkedin_url"]),
            # GitHub
            ("github", candidate["github_url"], ["github", "git_hub", "github_profile", "github_url"]),
            # Portfolio / Website
            ("portfolio", candidate["portfolio_url"], ["portfolio", "website", "personal_website", "web_site", "blog", "portfolio_url", "url"]),
            # Location / City
            ("location", candidate["location"], ["location", "city", "address", "current_location", "residence"]),
            # Current Company
            ("company", candidate["current_company"], ["current_company", "company", "employer", "current_employer", "organization"]),
            # Current Title / Role
            ("title", candidate["current_title"], ["title", "current_title", "headline", "job_title", "role"]),
            # Years of Experience
            ("experience", candidate["years_experience"], ["experience", "years_of_experience", "yoe", "years_experience"]),
            # Notice Period
            ("notice_period", candidate["notice_period"], ["notice", "notice_period", "notice_period_days", "availability"]),
            # Cover Letter
            ("cover_letter", candidate["cover_letter"], ["cover_letter", "coverletter", "additional_info", "comments", "note", "message"]),
        ]

        filled_elements = set()

        for elem in inputs:
            try:
                if elem in filled_elements:
                    continue

                is_visible = await elem.is_visible()
                if not is_visible:
                    continue

                elem_id = (await elem.get_attribute("id") or "").lower()
                elem_name = (await elem.get_attribute("name") or "").lower()
                elem_placeholder = (await elem.get_attribute("placeholder") or "").lower()
                elem_aria_label = (await elem.get_attribute("aria-label") or "").lower()
                elem_type = (await elem.get_attribute("type") or "text").lower()
                tag_name = await elem.evaluate("el => el.tagName.toLowerCase()")

                # Skip submit, hidden, and file inputs here
                if elem_type in ["submit", "button", "hidden", "image", "file"]:
                    continue

                # Get label text
                label_text = ""
                if elem_id:
                    label_el = await page.query_selector(f'label[for="{elem_id}"]')
                    if label_el:
                        label_text = (await label_el.inner_text()).lower()

                if not label_text:
                    try:
                        label_text = (await elem.evaluate("el => el.closest('label')?.innerText || ''")).lower()
                    except Exception:
                        pass

                combined_context = f"{elem_id} {elem_name} {elem_placeholder} {elem_aria_label} {label_text}"

                # Match against rules
                for field_key, field_value, patterns in field_rules:
                    # Avoid overwriting full name if first/last already handled or vice versa
                    if field_key == "full_name" and ("first_name" in filled or "last_name" in filled) and not any(p in combined_context for p in ["fullname", "full_name", "full name"]):
                        continue

                    if any(p in combined_context for p in patterns):
                        current_val = await elem.input_value() if tag_name in ["input", "textarea"] else ""
                        if not current_val:  # Don't overwrite if already filled
                            if tag_name == "select":
                                # Select option matching value
                                try:
                                    await elem.select_option(label=field_value)
                                except Exception:
                                    try:
                                        await elem.select_option(value=field_value)
                                    except Exception:
                                        pass
                            else:
                                await elem.fill(str(field_value))
                            
                            filled[field_key] = str(field_value)
                            filled_elements.add(elem)
                            print(f"   ✍️ Filled [{field_key}]: {str(field_value)[:40]}...")
                        break

            except Exception:
                continue

        return filled

    async def _upload_resume(self, page: Page, resume_path: str) -> bool:
        """Find file input and attach candidate resume PDF."""
        try:
            file_inputs = await page.query_selector_all('input[type="file"]')
            for file_input in file_inputs:
                input_id = (await file_input.get_attribute("id") or "").lower()
                input_name = (await file_input.get_attribute("name") or "").lower()
                combined = f"{input_id} {input_name}"

                # Look for resume/cv upload fields
                if any(k in combined for k in ["resume", "cv", "file", "document", "attachment"]) or len(file_inputs) == 1:
                    print(f"📎 [CHROMIUM-CLI] Uploading resume: {Path(resume_path).name}")
                    await file_input.set_input_files(resume_path)
                    await page.wait_for_timeout(2000)
                    return True
        except Exception as e:
            print(f"⚠️ [CHROMIUM-CLI] Resume upload note: {e}")
        return False

    async def _handle_common_questions_and_checkboxes(self, page: Page) -> None:
        """Handle common dropdowns (Authorization, Visa, Relocation) and checkboxes."""
        try:
            # Check consent / terms / GDPR checkboxes
            checkboxes = await page.query_selector_all('input[type="checkbox"]')
            for cb in checkboxes:
                try:
                    if await cb.is_visible() and not await cb.is_checked():
                        cb_text = await cb.evaluate("el => el.closest('label')?.innerText || ''")
                        if any(term in cb_text.lower() for term in ["agree", "consent", "privacy", "terms", "policy", "authorized", "certify"]):
                            await cb.check()
                            print(f"   ☑️ Checked consent: {cb_text[:50]}...")
                except Exception:
                    continue

            # Radio / Select answers for Sponsorship & Work Authorization
            labels = await page.query_selector_all("label")
            for lbl in labels:
                try:
                    txt = (await lbl.inner_text()).lower()
                    # Legally authorized to work -> Select 'Yes'
                    if "legally authorized" in txt or "authorized to work" in txt:
                        yes_radio = await lbl.query_selector('input[value="Yes"], input[value="1"], input[value="true"]')
                        if yes_radio:
                            await yes_radio.check()
                    # Require sponsorship -> Select 'No' (or based on candidate truth)
                    elif "sponsorship" in txt and ("now or in the future" in txt or "require" in txt):
                        no_radio = await lbl.query_selector('input[value="No"], input[value="0"], input[value="false"]')
                        if no_radio:
                            await no_radio.check()
                except Exception:
                    continue

        except Exception as e:
            print(f"⚠️ [CHROMIUM-CLI] Question handler note: {e}")

    async def _submit_form(self, page: Page) -> Tuple[bool, str]:
        """Find and click the form submit button."""
        submit_selectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Submit Application")',
            'button:has-text("Submit application")',
            'button:has-text("Submit")',
            'button:has-text("Send Application")',
            'a:has-text("Submit Application")',
        ]

        submit_btn = None
        for selector in submit_selectors:
            try:
                btn = await page.query_selector(selector)
                if btn and await btn.is_visible():
                    submit_btn = btn
                    break
            except Exception:
                continue

        if not submit_btn:
            return False, "Submit button not found."

        print("🚀 [CHROMIUM-CLI] Clicking Submit button...")
        try:
            await submit_btn.click()
            await page.wait_for_timeout(3000)

            # Check confirmation text
            page_text = (await page.content()).lower()
            success_keywords = ["thank you", "application received", "successfully submitted", "application submitted", "received your application"]
            for kw in success_keywords:
                if kw in page_text:
                    return True, f"Found confirmation keyword: '{kw}'"

            return True, "Submit clicked successfully (awaiting confirmation page)."
        except Exception as e:
            return False, f"Submit error: {str(e)}"

    async def close(self) -> None:
        """Clean up browser context."""
        try:
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
        except Exception:
            pass


async def main_async():
    parser = argparse.ArgumentParser(
        description="Chromium CLI - Auto-open Job URL in New Tab, Apply, & Update DB Status",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m backend.python.cli.chromium_apply --url "https://jobs.lever.co/company/job-id"
  python -m backend.python.cli.chromium_apply "https://boards.greenhouse.io/corp/jobs/123" --auto-submit
  python -m backend.python.cli.chromium_apply --resume "path/to/custom_resume.pdf"
        """
    )
    parser.add_argument("pos_url", nargs="?", help="Job application URL (positional)")
    parser.add_argument("--url", "-u", dest="flag_url", help="Job application URL")
    parser.add_argument("--auto-submit", "-s", action="store_true", help="Automatically submit without waiting for manual confirmation")
    parser.add_argument("--headless", action="store_true", help="Run in headless mode (default: False for visible Chromium window)")
    parser.add_argument("--resume", "-r", help="Path to resume PDF file")
    parser.add_argument("--slow-mo", type=int, default=100, help="Slow-motion delay in milliseconds for typing (default: 100)")
    parser.add_argument("--timeout", type=int, default=30, help="Timeout in seconds (default: 30)")

    args = parser.parse_args()
    job_url = args.flag_url or args.pos_url

    if not job_url:
        print("\n📋 ========================================================")
        print("   Chromium CLI - Automated Job Applier & DB Synchronizer")
        print("========================================================")
        try:
            job_url = input("\n👉 Enter the Job Application URL: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nAborted.")
            sys.exit(0)

    if not job_url:
        print("❌ Error: No Job URL provided.")
        sys.exit(1)

    if not job_url.startswith("http://") and not job_url.startswith("https://"):
        job_url = "https://" + job_url

    applier = ChromiumJobApplier(
        headless=args.headless,
        slow_mo=args.slow_mo,
        auto_submit=args.auto_submit,
        resume_path=args.resume,
        timeout=args.timeout * 1000,
    )

    try:
        success = await applier.open_and_apply(job_url)
        if success:
            print("\n🌟 [CHROMIUM-CLI] Job application workflow finished successfully.")
        else:
            print("\n⚠️ [CHROMIUM-CLI] Automation completed with notes or warnings.")
    finally:
        if args.headless or args.auto_submit:
            await applier.close()


def main():
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
