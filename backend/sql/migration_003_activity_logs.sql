-- ============================================================
-- Migration: Add activity_logs table + activity:read permission
-- ============================================================

USE gastos_db;

CREATE TABLE IF NOT EXISTS activity_logs (
    id          BIGINT UNSIGNED    NOT NULL AUTO_INCREMENT,
    user_id     BIGINT UNSIGNED    DEFAULT NULL COMMENT 'NULL para acciones anonimas',
    action     VARCHAR(100)       NOT NULL   COMMENT 'login, logout, create_user, etc.',
    module     VARCHAR(50)        NOT NULL   COMMENT 'auth, users, roles, permissions',
    type       VARCHAR(20)        NOT NULL   COMMENT 'auth, action, error',
    details    TEXT               DEFAULT NULL COMMENT 'JSON con detalles adicionales',
    ip_address VARCHAR(45)        DEFAULT NULL COMMENT 'IPv4 o IPv6 del cliente',
    user_agent VARCHAR(255)       DEFAULT NULL COMMENT 'Navegador o cliente',
    created_at DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_activity_logs_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_activity_logs_user    ON activity_logs (user_id);
CREATE INDEX idx_activity_logs_module  ON activity_logs (module);
CREATE INDEX idx_activity_logs_type    ON activity_logs (type);
CREATE INDEX idx_activity_logs_created ON activity_logs (created_at);

-- Permission
INSERT IGNORE INTO permissions (code, description, module) VALUES
    ('activity:read', 'Leer registro de auditoria', 'activity');

-- Assign to admin
INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'admin'
      AND p.code = 'activity:read';
