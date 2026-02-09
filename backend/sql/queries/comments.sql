-- name: CreateComment :one
INSERT INTO comments (article_id, user_id, body)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetCommentByID :one
SELECT c.*,
    u.username AS author_username,
    u.name AS author_name,
    u.avatar_url AS author_avatar_url
FROM comments c
JOIN users u ON c.user_id = u.id
WHERE c.id = $1;

-- name: ListCommentsByArticle :many
SELECT c.*,
    u.username AS author_username,
    u.name AS author_name,
    u.avatar_url AS author_avatar_url
FROM comments c
JOIN users u ON c.user_id = u.id
WHERE c.article_id = $1
ORDER BY c.created_at ASC
LIMIT $2 OFFSET $3;

-- name: DeleteComment :exec
DELETE FROM comments
WHERE id = $1 AND user_id = $2;

-- name: CountCommentsByArticle :one
SELECT COUNT(*)::int FROM comments
WHERE article_id = $1;
