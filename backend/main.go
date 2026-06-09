package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"blog-studio/backend/config"
	"blog-studio/backend/database"
	"blog-studio/backend/handlers"
	"blog-studio/backend/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	database.Init(cfg.DBPath)

	r := gin.Default()

	// CORS — allow frontend dev server and production
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:3001", os.Getenv("FRONTEND_URL")},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Serve uploaded files
	uploadsAbs, _ := filepath.Abs(cfg.UploadDir)
	r.Static("/uploads", uploadsAbs)

	// Handlers
	authH := handlers.NewAuthHandler(cfg.JWTSecret, cfg.AdminUsername, cfg.AdminPassword)
	authH.EnsureAdminExists()

	postH := handlers.NewPostHandler()
	catH := handlers.NewCategoryHandler()
	uploadH := handlers.NewUploadHandler(uploadsAbs, cfg.MaxUploadSizeMB)

	auth := middleware.AuthRequired(cfg.JWTSecret)

	api := r.Group("/api")
	{
		// Auth
		api.POST("/auth/login", authH.Login)
		api.GET("/auth/me", auth, authH.Me)

		// Categories (read is public)
		api.GET("/categories", catH.List)
		api.POST("/categories", auth, catH.Create)
		api.PUT("/categories/:id", auth, catH.Update)
		api.DELETE("/categories/:id", auth, catH.Delete)

		// Posts (read is public, write needs auth)
		api.GET("/posts", postH.List)
		api.GET("/posts/:slug", postH.Get)
		api.POST("/posts", auth, postH.Create)
		api.PUT("/posts/:id", auth, postH.Update)
		api.DELETE("/posts/:id", auth, postH.Delete)

		// Admin-only
		api.GET("/stats", auth, postH.Stats)

		// Upload
		api.POST("/upload", auth, uploadH.Upload)
	}

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	addr := ":" + cfg.Port
	log.Printf("blog-studio backend running on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatal(err)
	}
}
