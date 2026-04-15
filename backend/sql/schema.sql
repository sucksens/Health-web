-- ============================================================
-- Schema RBAC - Sistema de Usuarios con Roles y Permisos
-- Motor: MySQL 8+
-- ============================================================

CREATE DATABASE IF NOT EXISTS gastos_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE gastos_db;

-- ============================================================
-- Tabla: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id          BIGINT UNSIGNED    NOT NULL AUTO_INCREMENT,
    email       VARCHAR(255)       NOT NULL,
    username    VARCHAR(150)       NOT NULL,
    hashed_password VARCHAR(255)   NOT NULL,
    is_active      TINYINT(1)         NOT NULL DEFAULT 1,
    token_version  INT UNSIGNED       NOT NULL DEFAULT 1 COMMENT 'Se incrementa para invalidar todos los tokens del usuario',
    created_at     DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uk_users_email    (email),
    UNIQUE KEY uk_users_username (username)
) ENGINE=InnoDB;

-- ============================================================
-- Tabla: roles
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
    id          BIGINT UNSIGNED    NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100)       NOT NULL,
    description VARCHAR(255)       DEFAULT NULL,
    created_at  DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uk_roles_name (name)
) ENGINE=InnoDB;

-- ============================================================
-- Tabla: permissions
-- ============================================================
CREATE TABLE IF NOT EXISTS permissions (
    id          BIGINT UNSIGNED    NOT NULL AUTO_INCREMENT,
    code        VARCHAR(150)       NOT NULL   COMMENT 'Ej: users:create, expenses:read',
    description VARCHAR(255)       DEFAULT NULL,
    module      VARCHAR(100)       DEFAULT NULL COMMENT 'Agrupacion logica: users, expenses, reports',
    created_at  DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uk_permissions_code (code)
) ENGINE=InnoDB;

-- ============================================================
-- Tabla pivote: user_roles  (N:M)
-- Un usuario puede tener N roles.
-- ============================================================
CREATE TABLE IF NOT EXISTS user_roles (
    user_id     BIGINT UNSIGNED    NOT NULL,
    role_id     BIGINT UNSIGNED    NOT NULL,
    assigned_at DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, role_id),

    CONSTRAINT fk_user_roles_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_user_roles_role
        FOREIGN KEY (role_id) REFERENCES roles(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- Tabla pivote: role_permissions  (N:M)
-- Un rol puede tener N permisos.
-- ============================================================
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       BIGINT UNSIGNED    NOT NULL,
    permission_id BIGINT UNSIGNED    NOT NULL,
    assigned_at   DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (role_id, permission_id),

    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id) REFERENCES roles(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id) REFERENCES permissions(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- Tabla: refresh_tokens
-- Almacena sesiones activas de los usuarios.
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id           BIGINT UNSIGNED    NOT NULL AUTO_INCREMENT,
    user_id      BIGINT UNSIGNED    NOT NULL,
    token_jti    CHAR(36)           NOT NULL COMMENT 'UUID unico del token',
    expires_at   DATETIME           NOT NULL,
    created_at   DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at   DATETIME           DEFAULT NULL COMMENT 'NULL = activo, fecha = revocado',

    PRIMARY KEY (id),
    UNIQUE KEY uk_refresh_tokens_jti (token_jti),

    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- Indices para consultas frecuentes
-- ============================================================
CREATE INDEX idx_user_roles_role       ON user_roles (role_id);
CREATE INDEX idx_role_permissions_perm ON role_permissions (permission_id);
CREATE INDEX idx_permissions_module    ON permissions (module);
CREATE INDEX idx_users_is_active       ON users (is_active);
CREATE INDEX idx_refresh_tokens_user   ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at);

-- ============================================================
-- Datos iniciales: roles base
-- ============================================================
INSERT IGNORE INTO roles (name, description) VALUES
    ('admin',    'Administrador total del sistema'),
    ('manager',  'Gestor con permisos de lectura/escritura limitados'),
    ('user',     'Usuario basico con acceso de solo lectura');

-- ============================================================
-- Datos iniciales: permisos por modulo
-- ============================================================
INSERT IGNORE INTO permissions (code, description, module) VALUES
    -- Users
    ('users:create', 'Crear usuarios',                   'users'),
    ('users:read',   'Leer usuarios',                    'users'),
    ('users:update', 'Actualizar usuarios',              'users'),
    ('users:delete', 'Eliminar usuarios',                'users'),
    ('users:sessions', 'Gestionar sesiones de usuarios', 'users'),
    -- Roles
    ('roles:create', 'Crear roles',                      'roles'),
    ('roles:read',   'Leer roles',                       'roles'),
    ('roles:update', 'Actualizar roles',                 'roles'),
    ('roles:delete', 'Eliminar roles',                   'roles'),
    -- Permissions
    ('permissions:create', 'Crear permisos',             'permissions'),
    ('permissions:read',   'Leer permisos',              'permissions'),
    -- Expenses
    ('expenses:create', 'Crear gastos',                  'expenses'),
    ('expenses:read',   'Leer gastos',                   'expenses'),
    ('expenses:update', 'Actualizar gastos',             'expenses'),
    ('expenses:delete', 'Eliminar gastos',               'expenses'),
    -- Reports
    ('reports:read', 'Leer reportes',                    'reports');

-- ============================================================
-- Datos iniciales: asignar permisos a roles
-- ============================================================

-- Admin: TODOS los permisos
INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'admin';

-- Manager: lectura/escritura de gastos + lectura de reportes
INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'manager'
      AND p.code IN (
          'expenses:create', 'expenses:read', 'expenses:update', 'expenses:delete',
          'reports:read',
          'users:read'
      );

-- User: solo lectura de gastos propios
INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'user'
      AND p.code IN (
          'expenses:read', 'expenses:create'
      );

-- ============================================================
-- Datos iniciales: usuario admin por defecto
-- Contraseña: admin123  (bcrypt hash)
-- NOTA: Cambiar en produccion
-- ============================================================
INSERT IGNORE INTO users (email, username, hashed_password) VALUES
    ('admin@gastos.com', 'admin',
     '$2b$12$LJ3m4ys3Lk0TSwMCfVSLnOZXw3KnW9BGPHWHpMnnRlxrvdYlE5zGm');

INSERT IGNORE INTO user_roles (user_id, role_id)
    SELECT u.id, r.id
    FROM users u
    CROSS JOIN roles r
    WHERE u.username = 'admin'
      AND r.name = 'admin';
