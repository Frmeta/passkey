-- ----------------------------------------------------
-- Setup script for the passkey tutorial database
-- ----------------------------------------------------

-- 1. Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS webauthn_db;

-- 2. Use the created database
USE webauthn_db;

-- 3. Create the `users` table
-- This table stores the user information.
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE
);

-- 4. Create the `credentials` table
-- This table stores the passkey credentials for each user.
CREATE TABLE IF NOT EXISTS credentials (
    credential_id VARCHAR(512) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    public_key TEXT NOT NULL,
    counter BIGINT UNSIGNED NOT NULL,
    transports VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
