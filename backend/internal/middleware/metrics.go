package middleware

import (
	"net/http"
	"sync/atomic"
)

// Metrics is a middleware that counts HTTP requests
func Metrics(fileserverHits *atomic.Int32) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			fileserverHits.Add(1)
			next.ServeHTTP(w, r)
		})
	}
}
