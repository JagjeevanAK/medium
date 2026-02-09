-- +goose Up
ALTER TABLE users
    ADD COLUMN hashed_password TEXT NOT NULL DEFAULT '',
    ADD COLUMN username VARCHAR(50) UNIQUE,
    ADD COLUMN name VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN bio TEXT NOT NULL DEFAULT '',
    ADD COLUMN avatar_url TEXT NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE users
    DROP COLUMN hashed_password,
    DROP COLUMN username,
    DROP COLUMN name,
    DROP COLUMN bio,
    DROP COLUMN avatar_url;
