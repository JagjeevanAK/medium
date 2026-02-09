-- name: CreateTag :one
INSERT INTO tags (name)
VALUES (LOWER($1))
ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
RETURNING *;

-- name: GetTagByName :one
SELECT * FROM tags
WHERE name = LOWER($1);

-- name: ListTags :many
SELECT t.*, COUNT(at.article_id)::int AS article_count
FROM tags t
LEFT JOIN article_tags at ON t.id = at.tag_id
LEFT JOIN articles a ON at.article_id = a.id AND a.status = 'published'
GROUP BY t.id
ORDER BY article_count DESC;

-- name: AddArticleTag :exec
INSERT INTO article_tags (article_id, tag_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: RemoveArticleTags :exec
DELETE FROM article_tags
WHERE article_id = $1;

-- name: GetArticleTags :many
SELECT t.* FROM tags t
JOIN article_tags at ON t.id = at.tag_id
WHERE at.article_id = $1
ORDER BY t.name;

-- name: ListArticlesByTag :many
SELECT a.*,
    u.username AS author_username,
    u.name AS author_name,
    u.avatar_url AS author_avatar_url,
    COALESCE((SELECT SUM(c.count) FROM claps c WHERE c.article_id = a.id), 0)::int AS total_claps
FROM articles a
JOIN users u ON a.user_id = u.id
JOIN article_tags at ON a.id = at.article_id
JOIN tags t ON at.tag_id = t.id
WHERE t.name = LOWER($1) AND a.status = 'published'
ORDER BY a.published_at DESC
LIMIT $2 OFFSET $3;
