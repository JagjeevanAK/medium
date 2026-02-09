-- name: CreateUser :one
INSERT INTO users (id, created_at, updated_at, email, hashed_password, username, name)
VALUES (
    gen_random_uuid(),
    NOW(),
    NOW(),
    $1,
    $2,
    $3,
    $4
)
RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1;

-- name: GetUserByUsername :one
SELECT * FROM users
WHERE username = $1;

-- name: UpdateUserProfile :one
UPDATE users
SET name = $2, bio = $3, avatar_url = $4, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteUsers :exec
DELETE FROM users;
