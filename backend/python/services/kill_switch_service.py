from typing import Dict, Any
from datetime import datetime, timezone

class KillSwitchService:
    """
    Global Automation Emergency Stop & Domain Governance Engine:
    - Master Kill Switch: 'pause_all'
    - Granular Domain Kill Switches: 'pause_discovery', 'pause_applications', 'pause_emails', 'pause_referrals'
    - Verified before any autonomous job crawl, form submit, email reply, or referral outreach.
    """

    def __init__(self):
        self._state: Dict[str, Any] = {
            "pause_all": False,
            "pause_discovery": False,
            "pause_applications": False,
            "pause_emails": False,
            "pause_referrals": False,
            "last_updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "SYSTEM_DEFAULT",
            "reason": "Normal operations active"
        }

    def get_status(self) -> Dict[str, Any]:
        return dict(self._state)

    def is_paused(self, domain: str = "ALL") -> bool:
        if self._state["pause_all"]:
            return True
        
        domain_key = f"pause_{domain.lower()}"
        if domain_key in self._state:
            return bool(self._state[domain_key])
        
        return False

    def update_kill_switch(
        self,
        pause_all: bool,
        pause_discovery: bool,
        pause_applications: bool,
        pause_emails: bool,
        pause_referrals: bool,
        updated_by: str = "HUMAN_ADMIN",
        reason: str = "Administrator updated automation switches"
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        self._state = {
            "pause_all": pause_all,
            "pause_discovery": pause_discovery,
            "pause_applications": pause_applications,
            "pause_emails": pause_emails,
            "pause_referrals": pause_referrals,
            "last_updated_at": now,
            "updated_by": updated_by,
            "reason": reason
        }
        status_desc = "EMERGENCY PAUSE ALL ACTIVE" if pause_all else "Granular switches updated"
        print(f"[KILL_SWITCH] {status_desc} by {updated_by}. Reason: {reason}")
        return self.get_status()

kill_switch_service = KillSwitchService()
