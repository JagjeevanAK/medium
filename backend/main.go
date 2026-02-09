package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/jagjeevanak/golang-server/internal/config"
	"github.com/jagjeevanak/golang-server/internal/database"
	"github.com/jagjeevanak/golang-server/internal/middleware"
	"github.com/jagjeevanak/golang-server/internal/routes"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	godotenv.Load()
	dbURL := os.Getenv("DB_URL")
	platform := os.Getenv("PLATFORM")
	jwtSecret := os.Getenv("JWT_SECRET")

	if jwtSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Failed to create database connection:", err)
	}

	if err := db.Ping(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	dbQueries := database.New(db)

	mux := http.NewServeMux()

	apicfg := config.NewApiConfig(platform, jwtSecret)

	// Static file server with metrics
	mux.Handle("/app/", middleware.Metrics(&apicfg.FileserverHits)(http.StripPrefix("/app", http.FileServer((http.Dir("."))))))

	// Setup all API routes
	routes.SetupRoutes(mux, dbQueries, apicfg)

	// Wrap with CORS and logging middleware
	handler := middleware.CORS(middleware.Logger(mux))

	server := &http.Server{
		Addr:    ":8080",
		Handler: handler,
	}

	fmt.Println("Server running at http://localhost:8080")
	fmt.Println("API available at http://localhost:8080/api")
	err = server.ListenAndServe()
	if err != nil {
		log.Fatalf("Server error: %s", err)
	}
}
