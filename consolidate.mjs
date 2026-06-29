import fs from 'fs';
import path from 'path';

const migrations = [
  'supabase/migrations/20260628120000_onboarding_wizard.sql',
  'supabase/migrations/20260628133500_community_v2_phase1.sql',
  'supabase/migrations/20260628140000_community_v2_phase2.sql',
  'supabase/migrations/20260628200900_messaging_portal.sql',
  'supabase/migrations/20260628212000_user_followers.sql'
];

let consolidatedSql = `-- ============================================================================
-- LearnLoom Consolidated Migrations (June 28-29, 2026)
-- Onboarding Wizard, Community 2.0 (Phase 1 & 2), Messaging Portal, and Followers
-- ============================================================================

`;

for (const migration of migrations) {
  if (fs.existsSync(migration)) {
    consolidatedSql += `\n-- -------------------------------------------------------------
-- MIGRATION: ${path.basename(migration)}
-- -------------------------------------------------------------\n`;
    consolidatedSql += fs.readFileSync(migration, 'utf8') + '\n';
  }
}

consolidatedSql += `\n-- -------------------------------------------------------------
-- Schema Cache Reload
-- -------------------------------------------------------------\n`;
consolidatedSql += "NOTIFY pgrst, 'reload schema';\n";

fs.writeFileSync('supabase/migrations/consolidated_migrations.sql', consolidatedSql);
console.log('✅ Consolidated migrations file created at supabase/migrations/consolidated_migrations.sql');
