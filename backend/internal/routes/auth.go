package routes

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/jagjeevanak/golang-server/internal/auth"
	"github.com/jagjeevanak/golang-server/internal/config"
	"github.com/jagjeevanak/golang-server/internal/database"
	"github.com/jagjeevanak/golang-server/internal/middleware"
)

// AuthRoutes sets up authentication-related routes
func AuthRoutes(mux *http.ServeMux, dbQueries *database.Queries, cfg *config.ApiConfig) {
	// POST /api/auth/signup - Register a new user
	mux.HandleFunc("POST /api/auth/signup", func(w http.ResponseWriter, r *http.Request) {
		type request struct {
			Email    string `json:"email"`
			Username string `json:"username"`
			Password string `json:"password"`
			Name     string `json:"name"`
		}

		var req request
		if err := decodeJSON(r, &req); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		if req.Email == "" || req.Username == "" || req.Password == "" {
			respondError(w, http.StatusBadRequest, "Email, username, and password are required")
			return
		}

		if len(req.Password) < 6 {
			respondError(w, http.StatusBadRequest, "Password must be at least 6 characters")
			return
		}

		hashedPassword, err := auth.HashPassword(req.Password)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to process password")
			return
		}

		user, err := dbQueries.CreateUser(r.Context(), database.CreateUserParams{
			Email:          req.Email,
			HashedPassword: hashedPassword,
			Username:       sql.NullString{String: req.Username, Valid: true},
			Name:           req.Name,
		})
		if err != nil {
			respondError(w, http.StatusConflict, "User with this email or username already exists")
			return
		}

		accessToken, err := auth.MakeAccessToken(user.ID, cfg.JWTSecret)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to generate access token")
			return
		}

		refreshToken, err := auth.MakeRefreshToken()
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to generate refresh token")
			return
		}

		_, err = dbQueries.CreateRefreshToken(r.Context(), database.CreateRefreshTokenParams{
			Token:     refreshToken,
			UserID:    user.ID,
			ExpiresAt: time.Now().UTC().Add(auth.RefreshTokenExpiry),
		})
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to store refresh token")
			return
		}

		respondJSON(w, http.StatusCreated, map[string]interface{}{
			"user": userResponse(user),
			"tokens": map[string]string{
				"access_token":  accessToken,
				"refresh_token": refreshToken,
			},
		})
	})

	// POST /api/auth/signin - Sign in with email and password
	mux.HandleFunc("POST /api/auth/signin", func(w http.ResponseWriter, r *http.Request) {
		type request struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}

		var req request
		if err := decodeJSON(r, &req); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		if req.Email == "" || req.Password == "" {
			respondError(w, http.StatusBadRequest, "Email and password are required")
			return
		}

		user, err := dbQueries.GetUserByEmail(r.Context(), req.Email)
		if err != nil {
			respondError(w, http.StatusUnauthorized, "Invalid email or password")
			return
		}

		if err := auth.CheckPasswordHash(req.Password, user.HashedPassword); err != nil {
			respondError(w, http.StatusUnauthorized, "Invalid email or password")
			return
		}

		accessToken, err := auth.MakeAccessToken(user.ID, cfg.JWTSecret)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to generate access token")
			return
		}

		refreshToken, err := auth.MakeRefreshToken()
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to generate refresh token")
			return
		}

		_, err = dbQueries.CreateRefreshToken(r.Context(), database.CreateRefreshTokenParams{
			Token:     refreshToken,
			UserID:    user.ID,
			ExpiresAt: time.Now().UTC().Add(auth.RefreshTokenExpiry),
		})
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to store refresh token")
			return
		}

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"user": userResponse(user),
			"tokens": map[string]string{
				"access_token":  accessToken,
				"refresh_token": refreshToken,
			},
		})
	})

	// POST /api/auth/refresh - Refresh access token
	mux.HandleFunc("POST /api/auth/refresh", func(w http.ResponseWriter, r *http.Request) {
		type request struct {
			RefreshToken string `json:"refresh_token"`
		}

		var req request
		if err := decodeJSON(r, &req); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		if req.RefreshToken == "" {
			respondError(w, http.StatusBadRequest, "Refresh token is required")
			return
		}

		token, err := dbQueries.GetRefreshToken(r.Context(), req.RefreshToken)
		if err != nil {
			respondError(w, http.StatusUnauthorized, "Invalid refresh token")
			return
		}

		if token.RevokedAt.Valid {
			respondError(w, http.StatusUnauthorized, "Refresh token has been revoked")
			return
		}

		if time.Now().UTC().After(token.ExpiresAt) {
			respondError(w, http.StatusUnauthorized, "Refresh token has expired")
			return
		}

		accessToken, err := auth.MakeAccessToken(token.UserID, cfg.JWTSecret)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to generate access token")
			return
		}

		respondJSON(w, http.StatusOK, map[string]string{
			"access_token": accessToken,
		})
	})

	// POST /api/auth/logout - Revoke refresh token
	mux.Handle("POST /api/auth/logout", middleware.Auth(cfg.JWTSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		type request struct {
			RefreshToken string `json:"refresh_token"`
		}

		var req request
		if err := decodeJSON(r, &req); err != nil {
			respondError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		if req.RefreshToken == "" {
			respondError(w, http.StatusBadRequest, "Refresh token is required")
			return
		}

		err := dbQueries.RevokeRefreshToken(r.Context(), req.RefreshToken)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to revoke token")
			return
		}

		respondJSON(w, http.StatusOK, map[string]string{"message": "Logged out successfully"})
	})))
}

// userResponse creates a clean user response without sensitive fields
func userResponse(user database.User) map[string]interface{} {
	return map[string]interface{}{
		"id":         user.ID,
		"email":      user.Email,
		"username":   nullStringToStr(user.Username),
		"name":       user.Name,
		"bio":        user.Bio,
		"avatar_url": user.AvatarUrl,
		"created_at": user.CreatedAt,
		"updated_at": user.UpdatedAt,
	}
}
