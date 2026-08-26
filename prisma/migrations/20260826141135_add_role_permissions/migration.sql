-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_resource_action_key" ON "RolePermission"("role", "resource", "action");

-- Seed: mirrors the previous hardcoded matrix in src/lib/permissions.ts,
-- so behavior is unchanged until an admin edits it from the UI.
INSERT INTO "RolePermission" ("id", "role", "resource", "action") VALUES
('seed_admin_residents_create', 'ADMIN', 'residents', 'create'),
('seed_admin_residents_read', 'ADMIN', 'residents', 'read'),
('seed_admin_residents_update', 'ADMIN', 'residents', 'update'),
('seed_admin_residents_delete', 'ADMIN', 'residents', 'delete'),
('seed_admin_owners_create', 'ADMIN', 'owners', 'create'),
('seed_admin_owners_read', 'ADMIN', 'owners', 'read'),
('seed_admin_owners_update', 'ADMIN', 'owners', 'update'),
('seed_admin_owners_delete', 'ADMIN', 'owners', 'delete'),
('seed_admin_users_create', 'ADMIN', 'users', 'create'),
('seed_admin_users_read', 'ADMIN', 'users', 'read'),
('seed_admin_users_update', 'ADMIN', 'users', 'update'),
('seed_admin_users_delete', 'ADMIN', 'users', 'delete'),
('seed_admin_backups_create', 'ADMIN', 'backups', 'create'),
('seed_admin_backups_read', 'ADMIN', 'backups', 'read'),
('seed_admin_backups_delete', 'ADMIN', 'backups', 'delete'),
('seed_admin_mezanino_create', 'ADMIN', 'mezanino', 'create'),
('seed_admin_mezanino_read', 'ADMIN', 'mezanino', 'read'),
('seed_admin_mezanino_update', 'ADMIN', 'mezanino', 'update'),
('seed_admin_mezanino_delete', 'ADMIN', 'mezanino', 'delete'),
('seed_admin_scheduling_create', 'ADMIN', 'scheduling', 'create'),
('seed_admin_scheduling_read', 'ADMIN', 'scheduling', 'read'),
('seed_admin_scheduling_update', 'ADMIN', 'scheduling', 'update'),
('seed_admin_scheduling_delete', 'ADMIN', 'scheduling', 'delete'),
('seed_admin_reports_read', 'ADMIN', 'reports', 'read'),
('seed_admin_notices_create', 'ADMIN', 'notices', 'create'),
('seed_admin_notices_read', 'ADMIN', 'notices', 'read'),
('seed_admin_notices_delete', 'ADMIN', 'notices', 'delete'),
('seed_doorman_residents_create', 'DOORMAN', 'residents', 'create'),
('seed_doorman_residents_read', 'DOORMAN', 'residents', 'read'),
('seed_doorman_residents_update', 'DOORMAN', 'residents', 'update'),
('seed_doorman_owners_create', 'DOORMAN', 'owners', 'create'),
('seed_doorman_owners_read', 'DOORMAN', 'owners', 'read'),
('seed_doorman_owners_update', 'DOORMAN', 'owners', 'update'),
('seed_doorman_mezanino_create', 'DOORMAN', 'mezanino', 'create'),
('seed_doorman_mezanino_read', 'DOORMAN', 'mezanino', 'read'),
('seed_doorman_mezanino_update', 'DOORMAN', 'mezanino', 'update'),
('seed_doorman_mezanino_delete', 'DOORMAN', 'mezanino', 'delete'),
('seed_doorman_scheduling_create', 'DOORMAN', 'scheduling', 'create'),
('seed_doorman_scheduling_read', 'DOORMAN', 'scheduling', 'read'),
('seed_doorman_scheduling_update', 'DOORMAN', 'scheduling', 'update'),
('seed_doorman_scheduling_delete', 'DOORMAN', 'scheduling', 'delete'),
('seed_doorman_reports_read', 'DOORMAN', 'reports', 'read'),
('seed_doorman_notices_create', 'DOORMAN', 'notices', 'create'),
('seed_doorman_notices_read', 'DOORMAN', 'notices', 'read'),
('seed_doorman_notices_delete', 'DOORMAN', 'notices', 'delete');
