-- name: FollowUser :exec
INSERT INTO follows (follower_id, following_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: UnfollowUser :exec
DELETE FROM follows
WHERE follower_id = $1 AND following_id = $2;

-- name: IsFollowing :one
SELECT EXISTS(
    SELECT 1 FROM follows
    WHERE follower_id = $1 AND following_id = $2
)::bool AS is_following;

-- name: ListFollowers :many
SELECT u.id, u.username, u.name, u.avatar_url, u.bio
FROM users u
JOIN follows f ON f.follower_id = u.id
WHERE f.following_id = $1
ORDER BY f.created_at DESC
LIMIT $2 OFFSET $3;

-- name: ListFollowing :many
SELECT u.id, u.username, u.name, u.avatar_url, u.bio
FROM users u
JOIN follows f ON f.following_id = u.id
WHERE f.follower_id = $1
ORDER BY f.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountFollowers :one
SELECT COUNT(*)::int FROM follows
WHERE following_id = $1;

-- name: CountFollowing :one
SELECT COUNT(*)::int FROM follows
WHERE follower_id = $1;
