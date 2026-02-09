package routes

import (
	"database/sql"
	"net/http"

	"github.com/jagjeevanak/golang-server/internal/config"
	"github.com/jagjeevanak/golang-server/internal/database"
	"github.com/jagjeevanak/golang-server/internal/middleware"
)

// ClapRoutes sets up clap-related routes
func ClapRoutes(mux *http.ServeMux, dbQueries *database.Queries, cfg *config.ApiConfig) {
	// POST /api/articles/{id}/clap - Clap for article (auth required)
	mux.Handle("POST /api/articles/{id}/clap", middleware.Auth(cfg.JWTSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
			Count int32 `json:"count"`
		}

		var req request
		if err := decodeJSON(r, &req); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		if req.Count < 1 || req.Count > 50 {
			respondError(w, http.StatusBadRequest, "Clap count must be between 1 and 50")
			return
		}

		clap, err := dbQueries.UpsertClap(r.Context(), database.UpsertClapParams{
			ArticleID: articleID,
			UserID:    userID,
			Count:     req.Count,
		})
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to clap")
			return
		}

		totalClaps, _ := dbQueries.GetArticleClapCount(r.Context(), articleID)

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"user_claps":  clap.Count,
			"total_claps": totalClaps,
		})
	})))

	// GET /api/articles/{id}/claps - Get clap info for article
	mux.HandleFunc("GET /api/articles/{id}/claps", func(w http.ResponseWriter, r *http.Request) {
		articleID, err := getPathID(r, "id")
		if err != nil {
			respondError(w, http.StatusBadRequest, "Invalid article ID")
			return
		}

		totalClaps, err := dbQueries.GetArticleClapCount(r.Context(), articleID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to get clap count")
			return
		}

		// Try to get user's clap count if auth header present
		var userClaps int32
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" {
			// Attempt to extract user ID from token (optional)
			userID, ok := middleware.GetUserID(r)
			if ok {
				userClaps, _ = dbQueries.GetUserClapForArticle(r.Context(), database.GetUserClapForArticleParams{
					ArticleID: articleID,
					UserID:    userID,
				})
			}
		}

		resp := map[string]interface{}{
			"total_claps": totalClaps,
		}

		// Only include user_claps if we got a valid user
		if userClaps > 0 || (authHeader != "" && r.Context().Value(middleware.UserIDKey) != nil) {
			resp["user_claps"] = userClaps
		}

		respondJSON(w, http.StatusOK, resp)
	})
}

// sqlNullInt32 helper for wrapping optional int32 values
func sqlNullInt32(n int32) sql.NullInt32 {
	return sql.NullInt32{Int32: n, Valid: n > 0}
}
