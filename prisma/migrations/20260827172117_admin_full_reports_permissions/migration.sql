-- The PDF report route now requires `reports:create` (was `reports:read`), but the
-- original permission seed only gave ADMIN `reports:read`. Backfill full control for
-- ADMIN so a fresh install can generate/manage reports. Idempotent: skips rows an
-- admin may already have toggled on from the UI.
INSERT OR IGNORE INTO "RolePermission" ("id", "role", "resource", "action") VALUES
('backfill_admin_reports_create', 'ADMIN', 'reports', 'create'),
('backfill_admin_reports_update', 'ADMIN', 'reports', 'update'),
('backfill_admin_reports_delete', 'ADMIN', 'reports', 'delete');
