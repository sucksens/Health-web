-- ============================================================
-- Migration: Add must_change_password to users
-- ============================================================

USE gastos_db;

ALTER TABLE users
    ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Obliga al usuario a cambiar contrasena en el siguiente login'
    AFTER is_active;
