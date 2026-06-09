package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port           string
	DBPath         string
	JWTSecret      string
	AdminUsername  string
	AdminPassword  string
	UploadDir      string
	MaxUploadSizeMB int64
}

func Load() *Config {
	maxSize, _ := strconv.ParseInt(getEnv("MAX_UPLOAD_SIZE_MB", "10"), 10, 64)
	return &Config{
		Port:            getEnv("PORT", "8080"),
		DBPath:          getEnv("DB_PATH", "../data/blog.db"),
		JWTSecret:       getEnv("JWT_SECRET", "change-me-in-production-please"),
		AdminUsername:   getEnv("ADMIN_USERNAME", "admin"),
		AdminPassword:   getEnv("ADMIN_PASSWORD", "admin123"),
		UploadDir:       getEnv("UPLOAD_DIR", "../uploads"),
		MaxUploadSizeMB: maxSize,
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
