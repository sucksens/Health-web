-- ============================================================
-- Migration: refresh_tokens + token_version
-- Aplicar sobre BD existente
-- ============================================================

USE gastos_db;

ALTER TABLE users
    ADD COLUMN token_version INT UNSIGNED NOT NULL DEFAULT 1
        COMMENT 'Se incrementa para invalidar todos los tokens del usuario'
        AFTER is_active;

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

CREATE INDEX idx_refresh_tokens_user    ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at);
