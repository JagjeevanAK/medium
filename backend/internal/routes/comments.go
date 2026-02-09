package routes

import (
	"net/http"

	"github.com/jagjeevanak/golang-server/internal/config"
	"github.com/jagjeevanak/golang-server/internal/database"
	"github.com/jagjeevanak/golang-server/internal/middleware"
)

// CommentRoutes sets up comment-related routes
func CommentRoutes(mux *http.ServeMux, dbQueries *database.Queries, cfg *config.ApiConfig) {
	// POST /api/articles/{id}/comments - Add comment (auth required)
	mux.Handle("POST /api/articles/{id}/comments", middleware.Auth(cfg.JWTSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		articleID, err := getPathID(r, "id")
		if err != nil {
			respondError(w, http.StatusBadRequest, "Invalid article ID")
			return
		}

		type request struct {
			Body string `json:"body"`
		}

		var req request
		if err := decodeJSON(r, &req); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		if req.Body == "" {
			respondError(w, http.StatusBadRequest, "Comment body is required")
			return
		}

		comment, err := dbQueries.CreateComment(r.Context(), database.CreateCommentParams{
			ArticleID: articleID,
			UserID:    userID,
			Body:      req.Body,
		})
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to create comment")
			return
		}

		// Fetch the comment with author info
		fullComment, err := dbQueries.GetCommentByID(r.Context(), comment.ID)
		if err != nil {
			// Fallback: return basic comment
			respondJSON(w, http.StatusCreated, map[string]interface{}{
				"id":         comment.ID,
				"article_id": comment.ArticleID,
				"user_id":    comment.UserID,
				"body":       comment.Body,
				"created_at": comment.CreatedAt,
				"updated_at": comment.UpdatedAt,
			})
			return
		}

		respondJSON(w, http.StatusCreated, commentRowToResponse(fullComment))
	})))

	// GET /api/articles/{id}/comments - List comments for article
	mux.HandleFunc("GET /api/articles/{id}/comments", func(w http.ResponseWriter, r *http.Request) {
		articleID, err := getPathID(r, "id")
		if err != nil {
			respondError(w, http.StatusBadRequest, "Invalid article ID")
			return
		}

		limit, offset := getPagination(r)

		comments, err := dbQueries.ListCommentsByArticle(r.Context(), database.ListCommentsByArticleParams{
			ArticleID: articleID,
			Limit:     limit,
			Offset:    offset,
		})
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to fetch comments")
			return
		}

		result := make([]map[string]interface{}, 0, len(comments))
		for _, c := range comments {
			result = append(result, map[string]interface{}{
				"id":         c.ID,
				"article_id": c.ArticleID,
				"user_id":    c.UserID,
				"body":       c.Body,
				"created_at": c.CreatedAt,
				"updated_at": c.UpdatedAt,
				"author": map[string]string{
					"username":   nullStringToStr(c.AuthorUsername),
					"name":       c.AuthorName,
					"avatar_url": c.AuthorAvatarUrl,
				},
			})
		}

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"comments": result,
			"count":    len(result),
		})
	})

	// DELETE /api/comments/{id} - Delete own comment (auth required)
	mux.Handle("DELETE /api/comments/{id}", middleware.Auth(cfg.JWTSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		commentID, err := getPathID(r, "id")
		if err != nil {
			respondError(w, http.StatusBadRequest, "Invalid comment ID")
			return
		}

		err = dbQueries.DeleteComment(r.Context(), database.DeleteCommentParams{
			ID:     commentID,
			UserID: userID,
		})
		if err != nil {
			respondError(w, http.StatusNotFound, "Comment not found or not authorized")
			return
		}

		respondJSON(w, http.StatusOK, map[string]string{"message": "Comment deleted successfully"})
	})))
}

func commentRowToResponse(c database.GetCommentByIDRow) map[string]interface{} {
	return map[string]interface{}{
		"id":         c.ID,
		"article_id": c.ArticleID,
		"user_id":    c.UserID,
		"body":       c.Body,
		"created_at": c.CreatedAt,
		"updated_at": c.UpdatedAt,
		"author": map[string]string{
			"username":   nullStringToStr(c.AuthorUsername),
			"name":       c.AuthorName,
			"avatar_url": c.AuthorAvatarUrl,
		},
	}
}
