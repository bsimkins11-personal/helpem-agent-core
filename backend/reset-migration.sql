-- Mark migration 009 as completed (it actually succeeded but wasn't marked)
UPDATE "_prisma_migrations"
SET finished_at = NOW(),
    rolled_back_at = NULL
WHERE migration_name = '009_add_activity_hidden_state';
