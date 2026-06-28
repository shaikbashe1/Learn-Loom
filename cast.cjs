const fs = require('fs');
let content = fs.readFileSync('supabase/migrations/20260628200900_messaging_portal.sql', 'utf8');
content = content.replace(/auth\.uid\(\)/g, 'auth.uid()::text');
fs.writeFileSync('supabase/migrations/20260628200900_messaging_portal.sql', content);
