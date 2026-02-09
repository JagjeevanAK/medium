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
	mux.Handle("GET /api/admin/metrics", http.StripPrefix("/api/admin", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w,
			`<html>
			<body>
				<h1>Welcome, Chirpy Admin</h1>
				<p>Chirpy has been visited %d times!</p>
			</body>
			</html>`,
			cfg.FileserverHits.Load())
	})))

	mux.Handle("POST /api/admin/reset", http.StripPrefix("/api", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if cfg.Platform != "dev" {
			log.Println("someone tried to access the reset endpoint to delete db")
			w.WriteHeader(http.StatusForbidden)
			return
		}
		err := dbQueries.DeleteUsers(r.Context())
		if err != nil {
			log.Println("Failed to delete all the users")
			http.Error(w, "Failed to delete the table", http.StatusInternalServerError)
			return
		}
		cfg.FileserverHits.Swap(0)
		w.WriteHeader(http.StatusOK)
	})))
}
