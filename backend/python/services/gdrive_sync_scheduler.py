import asyncio
import re
from datetime import datetime, timezone
from backend.python.repositories.supabase_repo import db_helper
from backend.python.services.gdrive_sync_service import gdrive_sync_service

class GDriveSyncScheduler:
    """
    Server-Hosted Background Scheduler for Google Drive -> Database Sync.
    Runs continuously on the application server.
    Polls automation_settings table every minute to dynamically adapt to schedule changes.
    """

    def __init__(self):
        self._scheduler_task = None
        self._last_run_date = None
        self._last_run_hour = None

    def start(self):
        """Starts the background loop on the active event loop if not already running."""
        if self._scheduler_task is not None and not self._scheduler_task.done():
            return

        async def _loop():
            print("[GDRIVE_SCHEDULER] Server-hosted background sync scheduler active.")
            while True:
                try:
                    await asyncio.sleep(60)  # Check every 60 seconds
                    settings = db_helper.get_automation_settings()
                    
                    sync_enabled = settings.get("gdrive_sync_enabled", True)
                    if not sync_enabled:
                        continue

                    schedule_time_str = (settings.get("gdrive_sync_schedule_time") or settings.get("daily_schedule_time") or "07:00 AM IST").upper()
                    frequency = (settings.get("gdrive_sync_frequency") or "DAILY").upper()

                    now = datetime.now()
                    current_date_str = now.strftime("%Y-%m-%d")
                    current_hour_str = now.strftime("%Y-%m-%d-%H")

                    if frequency == "HOURLY":
                        if self._last_run_hour != current_hour_str:
                            self._last_run_hour = current_hour_str
                            print(f"[GDRIVE_SCHEDULER CRON] Triggering HOURLY Google Drive Sync at {now.strftime('%H:%M')}")
                            gdrive_sync_service.run_sync(triggered_by="HOURLY_CRON_SCHEDULER")
                    else: # DAILY (default: 07:00 AM IST)
                        match = re.search(r'(\d{1,2}):(\d{2})\s*(AM|PM)?', schedule_time_str)
                        if match:
                            hr = int(match.group(1))
                            mn = int(match.group(2))
                            ampm = match.group(3)
                            if ampm == "PM" and hr < 12:
                                hr += 12
                            elif ampm == "AM" and hr == 12:
                                hr = 0

                            if now.hour == hr and now.minute == mn and self._last_run_date != current_date_str:
                                self._last_run_date = current_date_str
                                print(f"[GDRIVE_SCHEDULER CRON] Triggering DAILY Google Drive Sync at {schedule_time_str}")
                                gdrive_sync_service.run_sync(triggered_by="DAILY_CRON_SCHEDULER")

                except Exception as err:
                    print(f"[GDRIVE_SCHEDULER] Scheduler error: {err}")

        try:
            loop = asyncio.get_running_loop()
            self._scheduler_task = loop.create_task(_loop())
        except Exception as e:
            print(f"[GDRIVE_SCHEDULER] Could not start loop: {e}")

gdrive_sync_scheduler = GDriveSyncScheduler()
