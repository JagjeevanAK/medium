package routes

import (
	"net/http"

	"github.com/jagjeevanak/golang-server/internal/config"
	"github.com/jagjeevanak/golang-server/internal/database"
	"github.com/jagjeevanak/golang-server/internal/middleware"
)

// UserRoutes sets up user profile-related routes
func UserRoutes(mux *http.ServeMux, dbQueries *database.Queries, cfg *config.ApiConfig) {
	// GET /api/users/{username} - Get public profile
	mux.HandleFunc("GET /api/users/{username}", func(w http.ResponseWriter, r *http.Request) {
		username := r.PathValue("username")
		if username == "" {
			respondError(w, http.StatusBadRequest, "Username is required")
			return
		}

		user, err := dbQueries.GetUserByUsername(r.Context(), sqlNullString(username))
		if err != nil {
			respondError(w, http.StatusNotFound, "User not found")
			return
		}

		followerCount, _ := dbQueries.CountFollowers(r.Context(), user.ID)
		followingCount, _ := dbQueries.CountFollowing(r.Context(), user.ID)

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"id":              user.ID,
			"username":        nullStringToStr(user.Username),
			"name":            user.Name,
			"bio":             user.Bio,
			"avatar_url":      user.AvatarUrl,
			"follower_count":  followerCount,
			"following_count": followingCount,
			"created_at":      user.CreatedAt,
		})
	})

	// PUT /api/users - Update own profile (auth required)
	mux.Handle("PUT /api/users", middleware.Auth(cfg.JWTSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		type request struct {
			Name      string `json:"name"`
			Bio       string `json:"bio"`
			AvatarUrl string `json:"avatar_url"`
		}

		var req request
		if err := decodeJSON(r, &req); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		user, err := dbQueries.UpdateUserProfile(r.Context(), database.UpdateUserProfileParams{
			ID:        userID,
			Name:      req.Name,
			Bio:       req.Bio,
			AvatarUrl: req.AvatarUrl,
		})
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to update profile")
			return
		}

		respondJSON(w, http.StatusOK, userResponse(user))
	})))
}
