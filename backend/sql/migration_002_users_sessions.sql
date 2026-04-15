-- ============================================================
-- Migration: Add users:sessions permission
-- ============================================================

USE gastos_db;

INSERT IGNORE INTO permissions (code, description, module) VALUES
    ('users:sessions', 'Gestionar sesiones de usuarios', 'users');

-- Admin: ya tiene todos los permisos via CROSS JOIN en schema.sql,
-- pero si la BD ya existia, hay que insertar la relacion manualmente.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'admin'
      AND p.code = 'users:sessions';
