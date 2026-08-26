"""
Playwright Automation Service for Job Application Form Filling

Handles browser automation for job application submissions including:
- Browser lifecycle management
- Form structure extraction
- Field filling with candidate data
- File uploads (resume, cover letter)
- Screenshot capture for audit trail
- CAPTCHA and login wall detection
- Multi-page form support
"""

from typing import Dict, Any, Optional, List, Tuple
import asyncio
import hashlib
import base64
from pathlib import Path
from datetime import datetime
import json

try:
    from playwright.async_api import async_playwright, Browser, Page, BrowserContext, TimeoutError as PlaywrightTimeout
except ImportError:
    # Graceful fallback if playwright not installed
    async_playwright = None
    Browser = Any
    Page = Any
    BrowserContext = Any
    PlaywrightTimeout = Exception


class PlaywrightAutomationService:
    """
    Core browser automation engine for job applications.
    Uses Playwright to navigate portals, extract forms, and submit applications.
    """

    def __init__(self):
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.playwright = None
        self.headless = True
        self.default_timeout = 30000  # 30 seconds

    async def initialize(self, headless: bool = False) -> None:
        """
        Initialize Playwright browser instance.

        Args:
            headless: Run browser in headless mode (False for visible browser window)
        """
        if async_playwright is None:
            raise ImportError(
                "Playwright is not installed. Run: pip install playwright && playwright install chromium"
            )

        # If already initialized in requested mode, reuse context
        if self.browser and self.context:
            if self.headless == headless:
                return
            await self.cleanup()

        self.headless = headless
        if not self.playwright:
            self.playwright = await async_playwright().start()

        # Launch Chromium with anti-detection measures and human speed for visibility
        self.browser = await self.playwright.chromium.launch(
            headless=headless,
            slow_mo=100 if not headless else 0,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
            ]
        )

        # Create context with realistic user agent and viewport
        self.context = await self.browser.new_context(
            viewport={'width': 1280, 'height': 800},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='en-US',
            timezone_id='America/New_York'
        )

        # Set default timeout
        self.context.set_default_timeout(self.default_timeout)
        print(f"[PLAYWRIGHT] Initialized Chromium browser (headless={headless})")

    async def navigate_to_job(self, url: str) -> Tuple[Page, bool]:
        """
        Navigate to job application URL and wait for page load.

        Args:
            url: Job application URL

        Returns:
            Tuple of (Page object, success boolean)
        """
        if not self.context:
            await self.initialize(headless=self.headless)

        page = await self.context.new_page()

        try:
            # Navigate with domcontentloaded for fast reliable load
            try:
                await page.goto(url, wait_until='domcontentloaded', timeout=15000)
            except PlaywrightTimeout:
                # If domcontentloaded timed out, attempt load
                await page.goto(url, wait_until='load', timeout=10000)

            # Wait a brief moment for dynamic hydration
            await page.wait_for_timeout(1500)

            return page, True

        except PlaywrightTimeout:
            print(f"[PLAYWRIGHT] Timeout navigating to {url}")
            return page, False
        except Exception as e:
            print(f"[PLAYWRIGHT] Error navigating to {url}: {str(e)}")
            return page, False

    async def find_and_open_application_form(self, page: Page) -> bool:
        """
        If a page is an overview job description without direct inputs,
        find and click the 'Apply' or 'Apply Now' CTA button to open the form.
        """
        try:
            apply_selectors = [
                'a:has-text("Apply on company site")',
                'button:has-text("Apply on company site")',
                'a:has-text("Easy Apply")',
                'button:has-text("Easy Apply")',
                'a:has-text("Apply Now")',
                'button:has-text("Apply Now")',
                'a:has-text("Apply")',
                'button:has-text("Apply")',
                '[data-qa="apply-button"]',
                '.apply-button',
                '#apply-button',
                'a[href*="apply"]'
            ]
            for sel in apply_selectors:
                btn = await page.query_selector(sel)
                if btn:
                    is_visible = await btn.is_visible()
                    if is_visible:
                        print(f"[PLAYWRIGHT] Found Apply button ({sel}), clicking to open form...")
                        await btn.click()
                        await page.wait_for_timeout(2500)
                        return True
        except Exception as e:
            print(f"[PLAYWRIGHT] Note checking apply button: {e}")
        return False

    async def extract_form_structure(self, page: Page) -> Dict[str, Any]:
        """
        Extract HTML form structure from the page.

        Args:
            page: Playwright Page object

        Returns:
            Dictionary containing form HTML, fields, and metadata
        """
        try:
            # Find all forms on the page
            forms = await page.query_selector_all('form')

            if not forms:
                # No <form> tag, might be a SPA - get all input fields
                form_html = await page.content()
            else:
                # Get the largest form (likely the application form)
                form_htmls = []
                for form in forms:
                    html = await form.inner_html()
                    form_htmls.append(html)

                # Pick the longest one
                form_html = max(form_htmls, key=len) if form_htmls else ""

            # Extract all input fields
            inputs = await page.query_selector_all('input, textarea, select')

            fields = []
            for input_elem in inputs:
                field_type = await input_elem.get_attribute('type') or 'text'
                field_id = await input_elem.get_attribute('id') or ''
                field_name = await input_elem.get_attribute('name') or ''
                field_placeholder = await input_elem.get_attribute('placeholder') or ''
                field_label = await self._get_field_label(page, input_elem)
                field_required = await input_elem.get_attribute('required') is not None

                fields.append({
                    'type': field_type,
                    'id': field_id,
                    'name': field_name,
                    'placeholder': field_placeholder,
                    'label': field_label,
                    'required': field_required,
                    'tag': await input_elem.evaluate('el => el.tagName.toLowerCase()')
                })

            # Generate hash of form structure
            form_hash = hashlib.sha256(form_html.encode()).hexdigest()

            return {
                'form_html': form_html[:50000],  # Limit size for LLM
                'fields': fields,
                'field_count': len(fields),
                'form_hash': form_hash,
                'page_url': page.url,
                'page_title': await page.title()
            }

        except Exception as e:
            print(f"[PLAYWRIGHT] Error extracting form structure: {str(e)}")
            return {
                'form_html': '',
                'fields': [],
                'field_count': 0,
                'form_hash': '',
                'page_url': page.url,
                'error': str(e)
            }

    async def _get_field_label(self, page: Page, input_elem: Any) -> str:
        """
        Try to find the label associated with an input field.

        Args:
            page: Playwright Page object
            input_elem: Input element

        Returns:
            Label text or empty string
        """
        try:
            # Try to find label by 'for' attribute
            field_id = await input_elem.get_attribute('id')
            if field_id:
                label = await page.query_selector(f'label[for="{field_id}"]')
                if label:
                    return await label.inner_text()

            # Try to find parent label
            parent = await input_elem.evaluate('el => el.closest("label")')
            if parent:
                return await parent.inner_text()

            return ''
        except:
            return ''

    async def fill_form(
        self,
        page: Page,
        field_mapping: Dict[str, str],
        candidate_data: Dict[str, Any]
    ) -> Tuple[bool, List[str]]:
        """
        Fill form fields with candidate data using the provided mapping.

        Args:
            page: Playwright Page object
            field_mapping: CSS selector mapping for each field
            candidate_data: Candidate profile data

        Returns:
            Tuple of (success boolean, list of error messages)
        """
        errors = []
        filled_count = 0

        try:
            for field_name, selector in field_mapping.items():
                if field_name.startswith('_'):
                    # Skip metadata fields like _required
                    continue

                # Get value from candidate data
                value = candidate_data.get(field_name)
                if value is None:
                    continue

                try:
                    # Check if element exists
                    element = await page.query_selector(selector)
                    if not element:
                        errors.append(f"Field '{field_name}' selector '{selector}' not found")
                        continue

                    # Get field type
                    tag_name = await element.evaluate('el => el.tagName.toLowerCase()')
                    field_type = await element.get_attribute('type') or 'text'

                    # Fill based on field type
                    if tag_name == 'select':
                        await element.select_option(str(value))
                    elif field_type in ['checkbox', 'radio']:
                        if value:
                            await element.check()
                    elif field_type == 'file':
                        # File upload handled separately
                        continue
                    else:
                        # Text input, textarea, etc.
                        await element.fill(str(value))

                    filled_count += 1
                    await page.wait_for_timeout(100)  # Small delay between fields

                except Exception as e:
                    errors.append(f"Error filling '{field_name}': {str(e)}")

            success = filled_count > 0 and len(errors) < len(field_mapping) / 2

            return success, errors

        except Exception as e:
            errors.append(f"Form filling failed: {str(e)}")
            return False, errors

    async def upload_file(
        self,
        page: Page,
        file_selector: str,
        file_path: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Upload a file (resume, cover letter) to the form.

        Args:
            page: Playwright Page object
            file_selector: CSS selector for file input
            file_path: Path to file on disk

        Returns:
            Tuple of (success boolean, error message if any)
        """
        try:
            # Check if file exists
            if not Path(file_path).exists():
                return False, f"File not found: {file_path}"

            # Find file input
            file_input = await page.query_selector(file_selector)
            if not file_input:
                return False, f"File input not found: {file_selector}"

            # Upload file
            await file_input.set_input_files(file_path)

            # Wait for upload to process
            await page.wait_for_timeout(2000)

            return True, None

        except Exception as e:
            return False, f"File upload error: {str(e)}"

    async def detect_captcha(self, page: Page) -> bool:
        """
        Detect if page contains CAPTCHA challenges.

        Args:
            page: Playwright Page object

        Returns:
            True if CAPTCHA detected
        """
        try:
            # Check for common CAPTCHA indicators
            captcha_indicators = [
                'iframe[src*="recaptcha"]',
                'iframe[src*="hcaptcha"]',
                'div[class*="captcha"]',
                'div[id*="captcha"]',
                '.g-recaptcha',
                '#recaptcha',
                '.h-captcha'
            ]

            for selector in captcha_indicators:
                element = await page.query_selector(selector)
                if element:
                    return True

            return False

        except:
            return False

    async def detect_login_wall(self, page: Page) -> bool:
        """
        Detect if page requires login/authentication.

        Args:
            page: Playwright Page object

        Returns:
            True if login required
        """
        try:
            # Check for login form indicators
            login_indicators = [
                'input[type="password"]',
                'input[name*="password"]',
                'input[name*="email"][type="email"] + input[type="password"]',
                'form[action*="login"]',
                'form[action*="signin"]',
                'button[type="submit"]:has-text("Sign in")',
                'button[type="submit"]:has-text("Log in")'
            ]

            for selector in login_indicators:
                element = await page.query_selector(selector)
                if element:
                    # Make sure it's not part of the application form
                    # (some applications ask for email/password fields)
                    page_content = await page.content()
                    if 'login' in page_content.lower() or 'sign in' in page_content.lower():
                        return True

            return False

        except:
            return False

    async def take_screenshot(
        self,
        page: Page,
        screenshot_type: str = 'audit'
    ) -> Tuple[bool, Optional[str]]:
        """
        Capture screenshot of current page state.

        Args:
            page: Playwright Page object
            screenshot_type: Type of screenshot (audit, error, success, captcha)

        Returns:
            Tuple of (success boolean, base64 encoded screenshot or None)
        """
        try:
            # Take full page screenshot
            screenshot_bytes = await page.screenshot(full_page=True, type='png')

            # Encode to base64
            screenshot_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')

            return True, screenshot_base64

        except Exception as e:
            print(f"[PLAYWRIGHT] Screenshot error: {str(e)}")
            return False, None

    async def submit_form(self, page: Page) -> Tuple[bool, str]:
        """
        Submit the application form.

        Args:
            page: Playwright Page object

        Returns:
            Tuple of (success boolean, status message)
        """
        try:
            # Find submit button - try multiple common patterns
            submit_selectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                'button:has-text("Submit")',
                'button:has-text("Apply")',
                'button:has-text("Send")',
                'button:has-text("Continue")',
                'a[class*="submit"]',
                'button[class*="submit"]'
            ]

            submit_button = None
            for selector in submit_selectors:
                submit_button = await page.query_selector(selector)
                if submit_button:
                    break

            if not submit_button:
                return False, "Submit button not found"

            # Click submit button
            await submit_button.click()

            # Wait for navigation or confirmation
            try:
                await page.wait_for_load_state('networkidle', timeout=10000)
            except PlaywrightTimeout:
                pass  # Might be SPA, no navigation

            # Wait a bit for confirmation message
            await page.wait_for_timeout(3000)

            # Check for success indicators
            page_content = await page.content()
            success_indicators = [
                'thank you',
                'application submitted',
                'successfully submitted',
                'confirmation',
                'application received'
            ]

            page_text_lower = page_content.lower()
            for indicator in success_indicators:
                if indicator in page_text_lower:
                    return True, f"Success indicator found: {indicator}"

            # Check for error indicators
            error_indicators = [
                'error',
                'required field',
                'invalid',
                'please enter',
                'field is required'
            ]

            for indicator in error_indicators:
                if indicator in page_text_lower:
                    return False, f"Error indicator found: {indicator}"

            # Uncertain - mark as needs review
            return False, "Submission status unclear - needs manual verification"

        except Exception as e:
            return False, f"Submission error: {str(e)}"

    async def identify_portal_type(self, page: Page) -> str:
        """
        Identify the type of application portal (Greenhouse, Lever, Workday, etc.)

        Args:
            page: Playwright Page object

        Returns:
            Portal type string (greenhouse, lever, workday, custom)
        """
        try:
            page_content = await page.content()
            page_url = page.url.lower()

            # Check URL patterns
            if 'greenhouse' in page_url or 'boards.greenhouse.io' in page_url:
                return 'greenhouse'
            if 'lever' in page_url or 'jobs.lever.co' in page_url:
                return 'lever'
            if 'myworkdayjobs' in page_url or 'workday' in page_url:
                return 'workday'
            if 'ashbyhq' in page_url:
                return 'ashby'
            if 'recruitee' in page_url:
                return 'recruitee'

            # Check meta tags and page content
            page_content_lower = page_content.lower()
            if 'greenhouse' in page_content_lower:
                return 'greenhouse'
            if 'lever' in page_content_lower:
                return 'lever'
            if 'workday' in page_content_lower:
                return 'workday'

            return 'custom'

        except:
            return 'custom'

    async def handle_multi_page_form(
        self,
        page: Page,
        max_pages: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Handle multi-step application forms.

        Args:
            page: Playwright Page object
            max_pages: Maximum number of form pages to process

        Returns:
            List of form structures for each page
        """
        forms = []
        current_page = 1

        while current_page <= max_pages:
            # Extract current page form
            form_structure = await self.extract_form_structure(page)
            forms.append({
                'page_number': current_page,
                'form': form_structure
            })

            # Look for "Next" or "Continue" button
            next_button_selectors = [
                'button:has-text("Next")',
                'button:has-text("Continue")',
                'button[class*="next"]',
                'a:has-text("Next")'
            ]

            next_button = None
            for selector in next_button_selectors:
                next_button = await page.query_selector(selector)
                if next_button:
                    break

            if not next_button:
                # No more pages
                break

            # Click next button
            await next_button.click()
            await page.wait_for_load_state('networkidle')
            await page.wait_for_timeout(2000)

            current_page += 1

        return forms

    async def close_page(self, page: Page) -> None:
        """Close a page gracefully."""
        try:
            await page.close()
        except:
            pass

    async def cleanup(self) -> None:
        """
        Clean up browser resources.
        Should be called when automation is complete.
        """
        try:
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()

            self.context = None
            self.browser = None
            self.playwright = None

        except Exception as e:
            print(f"[PLAYWRIGHT] Cleanup error: {str(e)}")


# Singleton instance
_automation_service: Optional[PlaywrightAutomationService] = None


def get_playwright_service() -> PlaywrightAutomationService:
    """
    Get singleton instance of PlaywrightAutomationService.

    Returns:
        PlaywrightAutomationService instance
    """
    global _automation_service
    if _automation_service is None:
        _automation_service = PlaywrightAutomationService()
    return _automation_service
