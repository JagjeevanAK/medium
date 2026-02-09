package routes

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jagjeevanak/golang-server/internal/config"
	"github.com/jagjeevanak/golang-server/internal/database"
	"github.com/jagjeevanak/golang-server/internal/middleware"
)

// ArticleRoutes sets up article-related routes
func ArticleRoutes(mux *http.ServeMux, dbQueries *database.Queries, cfg *config.ApiConfig) {
	// POST /api/articles - Create article (auth required)
	mux.Handle("POST /api/articles", middleware.Auth(cfg.JWTSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		type request struct {
			Title        string   `json:"title"`
			Body         string   `json:"body"`
			Summary      string   `json:"summary"`
			ThumbnailUrl string   `json:"thumbnail_url"`
			Status       string   `json:"status"`
			Tags         []string `json:"tags"`
		}

		var req request
		if err := decodeJSON(r, &req); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		if req.Title == "" || req.Body == "" {
			respondError(w, http.StatusBadRequest, "Title and body are required")
			return
		}

		if req.Status == "" {
			req.Status = "draft"
		}
		if req.Status != "draft" && req.Status != "published" {
			respondError(w, http.StatusBadRequest, "Status must be 'draft' or 'published'")
			return
		}

		article, err := dbQueries.CreateArticle(r.Context(), database.CreateArticleParams{
			UserID:       userID,
			Title:        req.Title,
			Body:         req.Body,
			Summary:      req.Summary,
			ThumbnailUrl: req.ThumbnailUrl,
			Status:       req.Status,
		})
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to create article")
			return
		}

		// If publishing immediately, update published_at
		if req.Status == "published" {
			article, err = dbQueries.PublishArticle(r.Context(), database.PublishArticleParams{
				ID:     article.ID,
				UserID: userID,
			})
			if err != nil {
				respondError(w, http.StatusInternalServerError, "Failed to publish article")
				return
			}
		}

		// Handle tags
		if len(req.Tags) > 0 {
			for _, tagName := range req.Tags {
				tag, err := dbQueries.CreateTag(r.Context(), tagName)
				if err != nil {
					continue
				}
				dbQueries.AddArticleTag(r.Context(), database.AddArticleTagParams{
					ArticleID: article.ID,
					TagID:     tag.ID,
				})
			}
		}

		// Fetch tags for response
		tags, _ := dbQueries.GetArticleTags(r.Context(), article.ID)

		respondJSON(w, http.StatusCreated, articleToResponse(article, tags, "", "", ""))
	})))

	// GET /api/articles - List published articles
	mux.HandleFunc("GET /api/articles", func(w http.ResponseWriter, r *http.Request) {
		limit, offset := getPagination(r)

		// Check for author filter
		author := r.URL.Query().Get("author")
		if author != "" {
			articles, err := dbQueries.ListArticlesByAuthor(r.Context(), database.ListArticlesByAuthorParams{
				Username: sql.NullString{String: author, Valid: true},
				Limit:    limit,
				Offset:   offset,
			})
			if err != nil {
				respondError(w, http.StatusInternalServerError, "Failed to fetch articles")
				return
			}

			result := make([]map[string]interface{}, 0, len(articles))
			for _, a := range articles {
				tags, _ := dbQueries.GetArticleTags(r.Context(), a.ID)
				result = append(result, articleRowToResponse(a.ID, a.UserID, a.Title, a.Body, a.Summary,
					a.ThumbnailUrl, a.Status, a.PublishedAt, a.CreatedAt, a.UpdatedAt,
					a.AuthorUsername, a.AuthorName, a.AuthorAvatarUrl, a.TotalClaps, tags))
			}
			respondJSON(w, http.StatusOK, map[string]interface{}{
				"articles": result,
				"count":    len(result),
			})
			return
		}

		articles, err := dbQueries.ListPublishedArticles(r.Context(), database.ListPublishedArticlesParams{
			Limit:  limit,
			Offset: offset,
		})
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to fetch articles")
			return
		}

		result := make([]map[string]interface{}, 0, len(articles))
		for _, a := range articles {
			tags, _ := dbQueries.GetArticleTags(r.Context(), a.ID)
			result = append(result, articleRowToResponse(a.ID, a.UserID, a.Title, a.Body, a.Summary,
				a.ThumbnailUrl, a.Status, a.PublishedAt, a.CreatedAt, a.UpdatedAt,
				a.AuthorUsername, a.AuthorName, a.AuthorAvatarUrl, a.TotalClaps, tags))
		}
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"articles": result,
			"count":    len(result),
		})
	})

	// GET /api/articles/feed - Feed from followed users (auth required)
	mux.Handle("GET /api/articles/feed", middleware.Auth(cfg.JWTSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		limit, offset := getPagination(r)

		articles, err := dbQueries.GetFeedArticles(r.Context(), database.GetFeedArticlesParams{
			FollowerID: userID,
			Limit:      limit,
			Offset:     offset,
		})
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to fetch feed")
			return
		}

		result := make([]map[string]interface{}, 0, len(articles))
		for _, a := range articles {
			tags, _ := dbQueries.GetArticleTags(r.Context(), a.ID)
			result = append(result, articleRowToResponse(a.ID, a.UserID, a.Title, a.Body, a.Summary,
				a.ThumbnailUrl, a.Status, a.PublishedAt, a.CreatedAt, a.UpdatedAt,
				a.AuthorUsername, a.AuthorName, a.AuthorAvatarUrl, a.TotalClaps, tags))
		}
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"articles": result,
			"count":    len(result),
		})
	})))

	// GET /api/articles/search - Search articles
	mux.HandleFunc("GET /api/articles/search", func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")
		if query == "" {
			respondError(w, http.StatusBadRequest, "Search query 'q' is required")
			return
		}

		limit, offset := getPagination(r)

		articles, err := dbQueries.SearchArticles(r.Context(), database.SearchArticlesParams{
			PlaintoTsquery: query,
			Limit:          limit,
			Offset:         offset,
		})
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to search articles")
			return
		}

		result := make([]map[string]interface{}, 0, len(articles))
		for _, a := range articles {
			tags, _ := dbQueries.GetArticleTags(r.Context(), a.ID)
			result = append(result, articleRowToResponse(a.ID, a.UserID, a.Title, a.Body, a.Summary,
				a.ThumbnailUrl, a.Status, a.PublishedAt, a.CreatedAt, a.UpdatedAt,
				a.AuthorUsername, a.AuthorName, a.AuthorAvatarUrl, a.TotalClaps, tags))
		}
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"articles": result,
			"count":    len(result),
		})
	})

	// GET /api/articles/drafts - List own drafts (auth required)
	mux.Handle("GET /api/articles/drafts", middleware.Auth(cfg.JWTSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		limit, offset := getPagination(r)

		articles, err := dbQueries.ListDraftsByUser(r.Context(), database.ListDraftsByUserParams{
			UserID: userID,
			Limit:  limit,
			Offset: offset,
		})
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to fetch drafts")
			return
		}

		result := make([]map[string]interface{}, 0, len(articles))
		for _, a := range articles {
			tags, _ := dbQueries.GetArticleTags(r.Context(), a.ID)
			result = append(result, articleRowToResponse(a.ID, a.UserID, a.Title, a.Body, a.Summary,
				a.ThumbnailUrl, a.Status, a.PublishedAt, a.CreatedAt, a.UpdatedAt,
				a.AuthorUsername, a.AuthorName, a.AuthorAvatarUrl, a.TotalClaps, tags))
		}
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"articles": result,
			"count":    len(result),
		})
	})))

	// GET /api/articles/{id} - Get single article
	mux.HandleFunc("GET /api/articles/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, err := getPathID(r, "id")
		if err != nil {
			respondError(w, http.StatusBadRequest, "Invalid article ID")
			return
		}

		article, err := dbQueries.GetArticleByID(r.Context(), id)
		if err != nil {
			respondError(w, http.StatusNotFound, "Article not found")
			return
		}

		tags, _ := dbQueries.GetArticleTags(r.Context(), article.ID)
		commentCount, _ := dbQueries.CountCommentsByArticle(r.Context(), article.ID)

		resp := articleRowToResponse(article.ID, article.UserID, article.Title, article.Body, article.Summary,
			article.ThumbnailUrl, article.Status, article.PublishedAt, article.CreatedAt, article.UpdatedAt,
			article.AuthorUsername, article.AuthorName, article.AuthorAvatarUrl, article.TotalClaps, tags)
		resp["comment_count"] = commentCount

		respondJSON(w, http.StatusOK, resp)
	})

	// PUT /api/articles/{id} - Update own article (auth required)
	mux.Handle("PUT /api/articles/{id}", middleware.Auth(cfg.JWTSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		id, err := getPathID(r, "id")
		if err != nil {
			respondError(w, http.StatusBadRequest, "Invalid article ID")
			return
		}

		type request struct {
			Title        string   `json:"title"`
			Body         string   `json:"body"`
			Summary      string   `json:"summary"`
			ThumbnailUrl string   `json:"thumbnail_url"`
			Tags         []string `json:"tags"`
		}

		var req request
		if err := decodeJSON(r, &req); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		article, err := dbQueries.UpdateArticle(r.Context(), database.UpdateArticleParams{
			ID:           id,
			Title:        req.Title,
			Body:         req.Body,
			Summary:      req.Summary,
			ThumbnailUrl: req.ThumbnailUrl,
			UserID:       userID,
		})
		if err != nil {
			respondError(w, http.StatusNotFound, "Article not found or not authorized")
			return
		}

		// Update tags: remove all existing, add new
		if req.Tags != nil {
			dbQueries.RemoveArticleTags(r.Context(), article.ID)
			for _, tagName := range req.Tags {
				tag, err := dbQueries.CreateTag(r.Context(), tagName)
				if err != nil {
					continue
				}
				dbQueries.AddArticleTag(r.Context(), database.AddArticleTagParams{
					ArticleID: article.ID,
					TagID:     tag.ID,
				})
			}
		}

		tags, _ := dbQueries.GetArticleTags(r.Context(), article.ID)
		respondJSON(w, http.StatusOK, articleToResponse(article, tags, "", "", ""))
	})))

	// DELETE /api/articles/{id} - Delete own article (auth required)
	mux.Handle("DELETE /api/articles/{id}", middleware.Auth(cfg.JWTSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		id, err := getPathID(r, "id")
		if err != nil {
			respondError(w, http.StatusBadRequest, "Invalid article ID")
			return
		}

		err = dbQueries.DeleteArticle(r.Context(), database.DeleteArticleParams{
			ID:     id,
			UserID: userID,
		})
		if err != nil {
			respondError(w, http.StatusNotFound, "Article not found or not authorized")
			return
		}

		respondJSON(w, http.StatusOK, map[string]string{"message": "Article deleted successfully"})
	})))

	// POST /api/articles/{id}/publish - Publish a draft (auth required)
	mux.Handle("POST /api/articles/{id}/publish", middleware.Auth(cfg.JWTSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		id, err := getPathID(r, "id")
		if err != nil {
			respondError(w, http.StatusBadRequest, "Invalid article ID")
			return
		}

		article, err := dbQueries.PublishArticle(r.Context(), database.PublishArticleParams{
			ID:     id,
			UserID: userID,
		})
		if err != nil {
			respondError(w, http.StatusNotFound, "Article not found or not authorized")
			return
		}

		tags, _ := dbQueries.GetArticleTags(r.Context(), article.ID)
		respondJSON(w, http.StatusOK, articleToResponse(article, tags, "", "", ""))
	})))
}

// articleToResponse converts an Article model to a JSON-friendly response
func articleToResponse(article database.Article, tags []database.Tag, authorUsername, authorName, authorAvatarUrl string) map[string]interface{} {
	tagNames := make([]string, 0, len(tags))
	for _, t := range tags {
		tagNames = append(tagNames, t.Name)
	}

	resp := map[string]interface{}{
		"id":            article.ID,
		"user_id":       article.UserID,
		"title":         article.Title,
		"body":          article.Body,
		"summary":       article.Summary,
		"thumbnail_url": article.ThumbnailUrl,
		"status":        article.Status,
		"published_at":  nullTimeToPtr(article.PublishedAt),
		"created_at":    article.CreatedAt,
		"updated_at":    article.UpdatedAt,
		"tags":          tagNames,
	}

	if authorUsername != "" {
		resp["author"] = map[string]string{
			"username":   authorUsername,
			"name":       authorName,
			"avatar_url": authorAvatarUrl,
		}
	}

	return resp
}

// articleRowToResponse is a generic helper that works with the various Row types from sqlc
func articleRowToResponse(
	id, userID uuid.UUID,
	title, body, summary, thumbnailUrl, status string,
	publishedAt sql.NullTime,
	createdAt, updatedAt time.Time,
	authorUsername sql.NullString,
	authorName, authorAvatarUrl string,
	totalClaps int32,
	tags []database.Tag,
) map[string]interface{} {
	tagNames := make([]string, 0, len(tags))
	for _, t := range tags {
		tagNames = append(tagNames, t.Name)
	}

	return map[string]interface{}{
		"id":            id,
		"user_id":       userID,
		"title":         title,
		"body":          body,
		"summary":       summary,
		"thumbnail_url": thumbnailUrl,
		"status":        status,
		"published_at":  nullTimeToPtr(publishedAt),
		"created_at":    createdAt,
		"updated_at":    updatedAt,
		"total_claps":   totalClaps,
		"tags":          tagNames,
		"author": map[string]string{
			"username":   nullStringToStr(authorUsername),
			"name":       authorName,
			"avatar_url": authorAvatarUrl,
		},
	}
}

// sqlNullString is a helper to create sql.NullString from a string
func sqlNullString(s string) sql.NullString {
	return sql.NullString{String: s, Valid: s != ""}
}
