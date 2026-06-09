package handlers

import (
	"net/http"
	"time"

	"blog-studio/backend/database"
	"blog-studio/backend/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	jwtSecret     string
	adminUsername string
	adminPassword string
}

func NewAuthHandler(jwtSecret, adminUsername, adminPassword string) *AuthHandler {
	return &AuthHandler{
		jwtSecret:     jwtSecret,
		adminUsername: adminUsername,
		adminPassword: adminPassword,
	}
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// EnsureAdminExists creates the admin user on first boot if it doesn't exist.
func (h *AuthHandler) EnsureAdminExists() {
	var user models.User
	result := database.DB.Where("username = ?", h.adminUsername).First(&user)
	if result.Error != nil {
		hash, _ := bcrypt.GenerateFromPassword([]byte(h.adminPassword), bcrypt.DefaultCost)
		database.DB.Create(&models.User{
			Username: h.adminUsername,
			Password: string(hash),
		})
	}
}

// POST /api/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":      user.ID,
		"username": user.Username,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
		"iat":      time.Now().Unix(),
	})

	signed, err := token.SignedString([]byte(h.jwtSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":    signed,
		"username": user.Username,
	})
}

// GET /api/auth/me
func (h *AuthHandler) Me(c *gin.Context) {
	username, _ := c.Get("username")
	c.JSON(http.StatusOK, gin.H{"username": username})
}
