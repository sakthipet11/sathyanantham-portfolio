import os
import glob
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:5432/postgres")

def setup_database():
    print(f"Connecting to local database at {DATABASE_URL}...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        print("Connected to PostgreSQL successfully!")

        # Execute Migrations in order
        migration_files = sorted(glob.glob("database/migrations/*.sql"))
        for file_path in migration_files:
            print(f"Running migration: {file_path}")
            with open(file_path, "r", encoding="utf-8") as f:
                sql_script = f.read()
                cursor.execute(sql_script)

        # Execute Seeds in order
        seed_files = sorted(glob.glob("database/seeds/*.sql"))
        for file_path in seed_files:
            print(f"Running seed script: {file_path}")
            with open(file_path, "r", encoding="utf-8") as f:
                sql_script = f.read()
                cursor.execute(sql_script)

        print("Database setup and seeding completed successfully!")
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"Database connection or execution failed: {e}")
        return False

if __name__ == "__main__":
    setup_database()
