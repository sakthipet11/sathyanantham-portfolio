import os
import sys
from dotenv import load_dotenv

# Load env variables from root .env
load_dotenv()

# Add apps/api to path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "apps", "api"))

def sync_certificates():
    from app.database.supabase_client import db_helper
    if not db_helper.is_configured():
        print("Error: Supabase is not configured. Check your env variables.")
        return

    print("Connected to Supabase. Updating certificates...")

    # Clear existing certificates (if table exists)
    try:
        # Fetch existing to get their IDs so we can delete them
        existing = db_helper.client.table("certificates").select("id").execute()
        if existing.data:
            print(f"Deleting {len(existing.data)} existing certificates...")
            for row in existing.data:
                db_helper.client.table("certificates").delete().eq("id", row["id"]).execute()
    except Exception as e:
        print(f"Warning/Error clearing certificates: {e}")

    # New certificates list
    certs = [
        {"name": "Introduction to Model Context Protocol", "issuer": "Anthropic Claude", "issue_date": "2024-06-01", "verification_url": None, "display_order": 1},
        {"name": "Building with the Claude API", "issuer": "Anthropic Claude", "issue_date": "2024-05-20", "verification_url": None, "display_order": 2},
        {"name": "Introduction to Agent Skills", "issuer": "Anthropic Claude", "issue_date": "2024-05-15", "verification_url": None, "display_order": 3},
        {"name": "Claude 101", "issuer": "Anthropic Claude", "issue_date": "2024-04-10", "verification_url": None, "display_order": 4},
        {"name": "Agentic AI", "issuer": "Udemy", "issue_date": "2024-08-12", "verification_url": None, "display_order": 5},
        {"name": "Generative AI Mastermind", "issuer": "Outskill", "issue_date": "2026-02-01", "verification_url": None, "display_order": 6},
        {"name": "Microfrontends with React: A Complete Developer's Guide", "issuer": "Udemy", "issue_date": "2023-12-15", "verification_url": None, "display_order": 7},
        {"name": "Advanced JavaScript – ECMAScript, ES2017", "issuer": "Udemy Academy", "issue_date": "2022-07-20", "verification_url": None, "display_order": 8},
        {"name": "React Complete Guide – React Hooks, React Router", "issuer": "Udemy Academy", "issue_date": "2023-05-10", "verification_url": None, "display_order": 9}
    ]

    # Insert new certificates
    inserted_count = 0
    for cert in certs:
        try:
            res = db_helper.client.table("certificates").insert(cert).execute()
            if res.data:
                inserted_count += 1
        except Exception as e:
            print(f"Error inserting certificate '{cert['name']}': {e}")

    print(f"Successfully synced {inserted_count}/{len(certs)} certificates to Supabase!")

if __name__ == "__main__":
    sync_certificates()
