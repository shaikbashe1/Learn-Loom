import logging
import json
from pathlib import Path
from config import settings

# Attempt to import supabase client
SUPABASE_AVAILABLE = False
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    pass

logger = logging.getLogger("ProblemEngine.SupabaseClient")

class SupabaseDatabase:
    def __init__(self):
        self.url = settings.SUPABASE_URL
        self.key = settings.SUPABASE_KEY
        self.client = None
        self.use_supabase = False
        
        # Determine local DB path
        self.local_db_path = Path(__file__).resolve().parent / "local_db.json"
        
        if SUPABASE_AVAILABLE and self.url and self.key and "your-project-id" not in self.url:
            try:
                self.client = create_client(self.url, self.key)
                self.use_supabase = True
                logger.info("Supabase database connection established.")
            except Exception as e:
                logger.error(f"Failed to connect to Supabase: {e}. Falling back to local file DB.")
        else:
            logger.warning("Supabase connection parameters missing. Running in LOCAL database fallback mode.")

    def _get_local_records(self) -> list:
        """Reads local DB json database."""
        if not self.local_db_path.exists():
            return []
        try:
            with open(self.local_db_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read local DB: {e}")
            return []

    def _save_local_records(self, records: list):
        """Saves local DB json database."""
        try:
            with open(self.local_db_path, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=4)
        except Exception as e:
            logger.error(f"Failed to save local DB: {e}")

    def get_next_id(self) -> str:
        """
        Queries database size and formats LL-000001, LL-000002, etc.
        """
        count = 0
        if self.use_supabase:
            try:
                # Query count of rows in problems table
                res = self.client.table("problems").select("id", count="exact").execute()
                count = res.count if hasattr(res, "count") else len(res.data)
            except Exception as e:
                logger.error(f"Failed to get count from Supabase: {e}. Reading from local.")
                count = len(self._get_local_records())
        else:
            count = len(self._get_local_records())

        next_idx = count + 1
        return f"LL-{next_idx:06d}"

    def calculate_xp(self, difficulty: str) -> int:
        """Calculates XP award based on problem difficulty."""
        diff = difficulty.lower()
        if diff == "easy":
            return 20
        elif diff == "medium":
            return 50
        elif diff == "hard":
            return 100
        return 50

    def insert_problem(self, problem: dict, testcases: dict, hints: dict, editorial: dict, starter_code: dict) -> str:
        """
        Assembles all components and inserts them into Supabase `coding_problems` and `problem_testcases`.
        Returns the generated UUID ID.
        """
        difficulty = problem.get("difficulty", "Medium")
        title = problem.get("title", "Untitled Problem")
        
        # Create a unique slug from title
        import re, uuid
        slug_base = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
        slug = f"{slug_base}-{str(uuid.uuid4())[:8]}"

        # Assemble full db schema record for coding_problems
        record = {
            "title": title,
            "slug": slug,
            "difficulty": difficulty,
            "description": problem.get("statement", ""),
            "topic": problem.get("topic", ""),
            "company_tags": problem.get("tags", []),
            "hints": hints.get("hints", []),
            "starter_code": starter_code,
            "constraints": problem.get("constraints", []),
            "time_limit_ms": 2000,
            "memory_limit_mb": 256
        }

        inserted_problem_id = None

        if self.use_supabase:
            try:
                logger.info(f"Inserting problem '{title}' into Supabase table 'coding_problems'...")
                # Insert the problem
                res = self.client.table("coding_problems").insert(record).execute()
                inserted_problem_id = res.data[0]['id']
                logger.info(f"Successfully inserted {inserted_problem_id} into Supabase.")
                
                # Insert testcases
                tc_records = []
                for tc in testcases.get("test_cases", []):
                    tc_records.append({
                        "problem_id": inserted_problem_id,
                        "input": str(tc.get("input", "")),
                        "expected_output": str(tc.get("expected_output", "")),
                        "is_hidden": tc.get("hidden", False)
                    })
                
                if tc_records:
                    self.client.table("problem_testcases").insert(tc_records).execute()
                    logger.info(f"Inserted {len(tc_records)} testcases for {inserted_problem_id}.")
                    
            except Exception as e:
                logger.error(f"Failed inserting into Supabase: {e}.")
        else:
            logger.error("Running without Supabase. Schema mapping requires Supabase.")
            
        return inserted_problem_id

    def list_all_problems(self) -> list:
        """Helper to get all problems currently in the database."""
        if self.use_supabase:
            try:
                res = self.client.table("problems").select("*").execute()
                return res.data
            except Exception as e:
                logger.error(f"Failed listing from Supabase: {e}")
                return self._get_local_records()
        else:
            return self._get_local_records()
