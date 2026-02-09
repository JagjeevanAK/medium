package config

import "sync/atomic"

// ApiConfig holds the application configuration
type ApiConfig struct {
	FileserverHits atomic.Int32
	Platform       string
}

// NewApiConfig creates a new API configuration
func NewApiConfig(platform string) *ApiConfig {
	return &ApiConfig{
		Platform: platform,
	}
}
