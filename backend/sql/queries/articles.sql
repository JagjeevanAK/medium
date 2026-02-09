-- name: CreateArticle :one
INSERT INTO articles (user_id, title, body, summary, thumbnail_url, status)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetArticleByID :one
SELECT a.*,
    u.username AS author_username,
    u.name AS author_name,
    u.avatar_url AS author_avatar_url,
    COALESCE((SELECT SUM(c.count) FROM claps c WHERE c.article_id = a.id), 0)::int AS total_claps
FROM articles a
JOIN users u ON a.user_id = u.id
WHERE a.id = $1;

-- name: ListPublishedArticles :many
SELECT a.*,
    u.username AS author_username,
    u.name AS author_name,
    u.avatar_url AS author_avatar_url,
    COALESCE((SELECT SUM(c.count) FROM claps c WHERE c.article_id = a.id), 0)::int AS total_claps
FROM articles a
JOIN users u ON a.user_id = u.id
WHERE a.status = 'published'
ORDER BY a.published_at DESC
LIMIT $1 OFFSET $2;

-- name: ListArticlesByAuthor :many
SELECT a.*,
    u.username AS author_username,
    u.name AS author_name,
    u.avatar_url AS author_avatar_url,
    COALESCE((SELECT SUM(c.count) FROM claps c WHERE c.article_id = a.id), 0)::int AS total_claps
FROM articles a
JOIN users u ON a.user_id = u.id
WHERE u.username = $1 AND a.status = 'published'
ORDER BY a.published_at DESC
LIMIT $2 OFFSET $3;

-- name: ListDraftsByUser :many
SELECT a.*,
    u.username AS author_username,
    u.name AS author_name,
    u.avatar_url AS author_avatar_url,
    0::int AS total_claps
FROM articles a
JOIN users u ON a.user_id = u.id
WHERE a.user_id = $1 AND a.status = 'draft'
ORDER BY a.updated_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateArticle :one
UPDATE articles
SET title = $2, body = $3, summary = $4, thumbnail_url = $5, updated_at = NOW()
WHERE id = $1 AND user_id = $6
RETURNING *;

-- name: PublishArticle :one
UPDATE articles
SET status = 'published', published_at = NOW(), updated_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: DeleteArticle :exec
DELETE FROM articles
WHERE id = $1 AND user_id = $2;

-- name: SearchArticles :many
SELECT a.*,
    u.username AS author_username,
    u.name AS author_name,
    u.avatar_url AS author_avatar_url,
    COALESCE((SELECT SUM(c.count) FROM claps c WHERE c.article_id = a.id), 0)::int AS total_claps
FROM articles a
JOIN users u ON a.user_id = u.id
WHERE a.status = 'published' AND a.search_vector @@ plainto_tsquery('english', $1)
ORDER BY ts_rank(a.search_vector, plainto_tsquery('english', $1)) DESC
LIMIT $2 OFFSET $3;

-- name: GetFeedArticles :many
SELECT a.*,
    u.username AS author_username,
    u.name AS author_name,
    u.avatar_url AS author_avatar_url,
    COALESCE((SELECT SUM(c.count) FROM claps c WHERE c.article_id = a.id), 0)::int AS total_claps
FROM articles a
JOIN users u ON a.user_id = u.id
JOIN follows f ON f.following_id = a.user_id
WHERE f.follower_id = $1 AND a.status = 'published'
ORDER BY a.published_at DESC
LIMIT $2 OFFSET $3;
