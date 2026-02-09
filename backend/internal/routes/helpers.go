package routes

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
)

// respondJSON writes a JSON response with the given status code
func respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	data, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Error marshalling JSON: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(status)
	w.Write(data)
}

// respondError writes a JSON error response
func respondError(w http.ResponseWriter, status int, msg string) {
	respondJSON(w, status, map[string]string{"error": msg})
}

// decodeJSON decodes a JSON request body into the target struct
func decodeJSON(r *http.Request, target interface{}) error {
	return json.NewDecoder(r.Body).Decode(target)
}

// getPathID extracts a UUID from the last segment of the URL path
func getPathID(r *http.Request, name string) (uuid.UUID, error) {
	idStr := r.PathValue(name)
	return uuid.Parse(idStr)
}

// getPagination extracts limit and offset from query parameters with defaults
func getPagination(r *http.Request) (limit, offset int32) {
	limit = 20
	offset = 0

	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = int32(parsed)
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = int32(parsed)
		}
	}
	return
}

// nullTimeToPtr converts sql.NullTime to a *time.Time pointer (nil if not valid)
func nullTimeToPtr(nt sql.NullTime) *time.Time {
	if nt.Valid {
		return &nt.Time
	}
	return nil
}

// nullStringToStr converts sql.NullString to a plain string (empty if not valid)
func nullStringToStr(ns sql.NullString) string {
	if ns.Valid {
		return ns.String
	}
	return ""
}
