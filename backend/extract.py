import re

with open("C:/Users/dell/Learn-Loom/supabase/migrations/consolidated_migrations.sql", "r", encoding="utf-8") as f:
    content = f.read()

match = re.search(r'CREATE OR REPLACE FUNCTION public\.handle_new_user.*?END;\s*\$\$ LANGUAGE plpgsql SECURITY DEFINER;', content, re.DOTALL)
if match:
    print(match.group(0))
else:
    print("Not found")
