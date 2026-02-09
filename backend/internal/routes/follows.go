package routes

import (
	"net/http"

	"github.com/jagjeevanak/golang-server/internal/config"
	"github.com/jagjeevanak/golang-server/internal/database"
	"github.com/jagjeevanak/golang-server/internal/middleware"
)

// FollowRoutes sets up follow-related routes
func FollowRoutes(mux *http.ServeMux, dbQueries *database.Queries, cfg *config.ApiConfig) {
	// POST /api/users/{username}/follow - Follow a user (auth required)
	mux.Handle("POST /api/users/{username}/follow", middleware.Auth(cfg.JWTSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		followerID, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		username := r.PathValue("username")
		if username == "" {
			respondError(w, http.StatusBadRequest, "Username is required")
			return
		}

		targetUser, err := dbQueries.GetUserByUsername(r.Context(), sqlNullString(username))
		if err != nil {
			respondError(w, http.StatusNotFound, "User not found")
			return
		}

		if targetUser.ID == followerID {
			respondError(w, http.StatusBadRequest, "Cannot follow yourself")
			return
		}

		err = dbQueries.FollowUser(r.Context(), database.FollowUserParams{
			FollowerID:  followerID,
			FollowingID: targetUser.ID,
		})
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to follow user")
			return
		}

		respondJSON(w, http.StatusOK, map[string]string{"message": "Followed successfully"})
	})))

	// DELETE /api/users/{username}/follow - Unfollow a user (auth required)
	mux.Handle("DELETE /api/users/{username}/follow", middleware.Auth(cfg.JWTSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		followerID, ok := middleware.GetUserID(r)
		if !ok {
			respondError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		username := r.PathValue("username")
		if username == "" {
			respondError(w, http.StatusBadRequest, "Username is required")
			return
		}

		targetUser, err := dbQueries.GetUserByUsername(r.Context(), sqlNullString(username))
		if err != nil {
			respondError(w, http.StatusNotFound, "User not found")
			return
		}

		err = dbQueries.UnfollowUser(r.Context(), database.UnfollowUserParams{
			FollowerID:  followerID,
			FollowingID: targetUser.ID,
		})
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to unfollow user")
			return
		}

		respondJSON(w, http.StatusOK, map[string]string{"message": "Unfollowed successfully"})
	})))

	// GET /api/users/{username}/followers - List followers
	mux.HandleFunc("GET /api/users/{username}/followers", func(w http.ResponseWriter, r *http.Request) {
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

		limit, offset := getPagination(r)

		followers, err := dbQueries.ListFollowers(r.Context(), database.ListFollowersParams{
			FollowingID: user.ID,
			Limit:       limit,
			Offset:      offset,
		})
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to fetch followers")
			return
		}

		result := make([]map[string]interface{}, 0, len(followers))
		for _, f := range followers {
			result = append(result, map[string]interface{}{
				"id":         f.ID,
				"username":   nullStringToStr(f.Username),
				"name":       f.Name,
				"avatar_url": f.AvatarUrl,
				"bio":        f.Bio,
			})
		}

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"followers": result,
			"count":     len(result),
		})
	})

	// GET /api/users/{username}/following - List following
	mux.HandleFunc("GET /api/users/{username}/following", func(w http.ResponseWriter, r *http.Request) {
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

		limit, offset := getPagination(r)

		following, err := dbQueries.ListFollowing(r.Context(), database.ListFollowingParams{
			FollowerID: user.ID,
			Limit:      limit,
			Offset:     offset,
		})
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to fetch following")
			return
		}

		result := make([]map[string]interface{}, 0, len(following))
		for _, f := range following {
			result = append(result, map[string]interface{}{
				"id":         f.ID,
				"username":   nullStringToStr(f.Username),
				"name":       f.Name,
				"avatar_url": f.AvatarUrl,
				"bio":        f.Bio,
			})
		}

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"following": result,
			"count":     len(result),
		})
	})
}
