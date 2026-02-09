package routes

import (
	"net/http"

	"github.com/jagjeevanak/golang-server/internal/config"
	"github.com/jagjeevanak/golang-server/internal/database"
)

// SetupRoutes initializes all route handlers
func SetupRoutes(mux *http.ServeMux, dbQueries *database.Queries, cfg *config.ApiConfig) {
	// Setup all route groups
	AuthRoutes(mux, dbQueries)
	UserRoutes(mux, dbQueries)
	AdminRoutes(mux, dbQueries, cfg)
	HealthRoutes(mux)
}
