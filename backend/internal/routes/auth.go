package routes

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/jagjeevanak/golang-server/internal/database"
)

// AuthRoutes sets up authentication-related routes
func AuthRoutes(mux *http.ServeMux, dbQueries *database.Queries) {
	mux.Handle("POST /api/signin", http.StripPrefix("/api", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		type userData struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		data := json.NewDecoder(r.Body)
		params := userData{}
		err := data.Decode(&params)
		if err != nil {
			http.Error(w, "failed to decode signin data", http.StatusBadRequest)
			return
		}
		fmt.Println("username: "+params.Username, "password: "+params.Password)
	})))

	mux.Handle("POST /api/signup", http.StripPrefix("/api", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		type Request struct {
			Status bool `json:"status"`
		}

		res := Request{
			Status: true,
		}

		data, err := json.Marshal(res)
		if err != nil {
			log.Printf("Error while Marshalling JSON data %s", err)
			w.WriteHeader(200)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write(data)
	})))
}
