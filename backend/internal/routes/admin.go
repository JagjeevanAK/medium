package routes

import (
	"fmt"
	"log"
	"net/http"

	"github.com/jagjeevanak/golang-server/internal/config"
	"github.com/jagjeevanak/golang-server/internal/database"
)

// AdminRoutes sets up admin-related routes
func AdminRoutes(mux *http.ServeMux, dbQueries *database.Queries, cfg *config.ApiConfig) {
	// GET /api/admin/metrics - Show fileserver hit count
	mux.HandleFunc("GET /api/admin/metrics", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w,
			`<html>
			<body>
				<h1>Welcome, Medium Admin</h1>
				<p>Server has been visited %d times!</p>
			</body>
			</html>`,
			cfg.FileserverHits.Load())
	})

	// POST /api/admin/reset - Reset database (dev only)
	mux.HandleFunc("POST /api/admin/reset", func(w http.ResponseWriter, r *http.Request) {
		if cfg.Platform != "dev" {
			log.Println("unauthorized attempt to access reset endpoint")
			w.WriteHeader(http.StatusForbidden)
			return
		}
		err := dbQueries.DeleteUsers(r.Context())
		if err != nil {
			log.Printf("Failed to delete all users: %v", err)
			http.Error(w, "Failed to reset database", http.StatusInternalServerError)
			return
		}
		cfg.FileserverHits.Swap(0)
		w.WriteHeader(http.StatusOK)
	})
}
