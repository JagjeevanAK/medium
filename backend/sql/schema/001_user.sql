-- +goose Up
CREATE TABLE IF NOT EXISTS users(
    id UUID PRIMARY KEY,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    email VARCHAR(50) NOT NULL UNIQUE
);

-- +goose Down
DROP TABLE IF EXISTS users;