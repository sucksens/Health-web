-- ============================================================
-- Migration: Add first_name, last_name to users
-- ============================================================

USE gastos_db;

ALTER TABLE users
    ADD COLUMN first_name VARCHAR(100) DEFAULT NULL AFTER username,
    ADD COLUMN last_name VARCHAR(100) DEFAULT NULL AFTER first_name;
