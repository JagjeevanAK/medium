-- name: UpsertClap :one
INSERT INTO claps (article_id, user_id, count)
VALUES ($1, $2, $3)
ON CONFLICT (article_id, user_id) DO UPDATE
SET count = LEAST(claps.count + EXCLUDED.count, 50),
    updated_at = NOW()
RETURNING *;

-- name: GetArticleClapCount :one
SELECT COALESCE(SUM(count), 0)::int AS total_claps
FROM claps
WHERE article_id = $1;

-- name: GetUserClapForArticle :one
SELECT COALESCE(count, 0)::int AS user_claps
FROM claps
WHERE article_id = $1 AND user_id = $2;
