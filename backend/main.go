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
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Failed to create database connection:", err)
	}
	dbQueries := database.New(db)

	mux := http.NewServeMux()

	apicfg := config.NewApiConfig(platform)

	// mux.Handle("/", http.FileServer(http.Dir(".")))
	mux.Handle("/app/", middleware.Metrics(&apicfg.FileserverHits)(http.StripPrefix("/app", http.FileServer((http.Dir("."))))))

	routes.SetupRoutes(mux, dbQueries, apicfg)

	server := &http.Server{
		Addr:    ":8080",
		Handler: middleware.Logger(mux),
	}

	fmt.Println("Server url: http://localhost:8080")
	err = server.ListenAndServe()
	if err != nil {
		log.Printf("error:%s", err)
	}
}
