package routes

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/jagjeevanak/golang-server/internal/database"
)

// UserRoutes sets up user-related routes
func UserRoutes(mux *http.ServeMux, dbQueries *database.Queries) {
	mux.HandleFunc("POST /api/users", func(w http.ResponseWriter, r *http.Request) {
		type reqData struct {
			Email string `json:"email"`
		}

		data := json.NewDecoder(r.Body)
		params := reqData{}

		err := data.Decode(&params)
		if err != nil {
			log.Printf("Issue while Decoding json data or may no required data is present in body: %v", err)
			http.Error(w, "Invalid JSON data", http.StatusBadRequest)
			return
		}

		userData, err := dbQueries.CreateUser(r.Context(), params.Email)
		if err != nil {
			http.Error(w, "Failed to create user", http.StatusInternalServerError)
			return
		}

		user, err := json.Marshal(userData)
		if err != nil {
			log.Printf("Failed to marshal the data %s\n", err)
			http.Error(w, "Failed to marshal user data", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write(user)
	})
}

// ChirpRoutes sets up chirp-related routes
func ChirpRoutes(mux *http.ServeMux, dbQueries *database.Queries) {
	mux.HandleFunc("POST /api/chirps", func(w http.ResponseWriter, r *http.Request) {
		type bodyData struct {
			Body    string    `json:"body"`
			User_id uuid.UUID `json:"user_id"`
		}

		data := json.NewDecoder(r.Body)
		params := bodyData{}

		err := data.Decode(&params)
		if err != nil {
			log.Println("failed to marshal the data")
			return
		}

		// TODO: Add chirp creation logic here
		// For now, just return success
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"message": "Chirp created successfully"}`))
	})
}
