-- Doorman only had `reports:read`, so PATCH/PDF generation (which requires
-- `reports:create`, see 20260827172117_admin_full_reports_permissions) was
-- blocked for that role. Building staff confirmed the doorman should have
-- the same full control over reports as the admin. Idempotent: skips rows
-- an admin may already have toggled on from the UI.
INSERT OR IGNORE INTO "RolePermission" ("id", "role", "resource", "action") VALUES
('backfill_doorman_reports_create', 'DOORMAN', 'reports', 'create'),
('backfill_doorman_reports_update', 'DOORMAN', 'reports', 'update'),
('backfill_doorman_reports_delete', 'DOORMAN', 'reports', 'delete');
