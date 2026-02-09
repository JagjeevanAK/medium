package routes

import (
	"net/http"

	"github.com/jagjeevanak/golang-server/internal/config"
	"github.com/jagjeevanak/golang-server/internal/database"
)

// SetupRoutes initializes all route handlers
func SetupRoutes(mux *http.ServeMux, dbQueries *database.Queries, cfg *config.ApiConfig) {
	// Auth routes (signup, signin, refresh, logout)
	AuthRoutes(mux, dbQueries, cfg)

	// User profile routes
	UserRoutes(mux, dbQueries, cfg)

	// Article routes (CRUD, publish, drafts, feed, search)
	ArticleRoutes(mux, dbQueries, cfg)

	// Tag routes
	TagRoutes(mux, dbQueries)

	// Comment routes
	CommentRoutes(mux, dbQueries, cfg)

	// Clap routes
	ClapRoutes(mux, dbQueries, cfg)

	// Follow routes
	FollowRoutes(mux, dbQueries, cfg)

	// Admin routes
	AdminRoutes(mux, dbQueries, cfg)

	// Health check
	HealthRoutes(mux)
}
