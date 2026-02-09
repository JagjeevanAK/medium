-- +goose Up
CREATE TABLE claps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    count INT NOT NULL DEFAULT 1 CHECK (count >= 1 AND count <= 50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (article_id, user_id)
);

CREATE INDEX idx_claps_article_id ON claps(article_id);

-- +goose Down
DROP TABLE IF EXISTS claps;
