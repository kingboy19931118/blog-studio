package handlers

import (
	"net/http"
	"regexp"
	"strings"

	"blog-studio/backend/database"
	"blog-studio/backend/models"

	"github.com/gin-gonic/gin"
)

type CategoryHandler struct{}

func NewCategoryHandler() *CategoryHandler { return &CategoryHandler{} }

type CategoryRequest struct {
	Name  string `json:"name" binding:"required"`
	Color string `json:"color"`
}

func slugify(s string) string {
	s = strings.ToLower(s)
	re := regexp.MustCompile(`[^a-z0-9一-龥]+`)
	s = re.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

// GET /api/categories
func (h *CategoryHandler) List(c *gin.Context) {
	var categories []models.Category
	database.DB.Find(&categories)

	for i := range categories {
		var count int64
		database.DB.Model(&models.Post{}).
			Where("category_id = ? AND status = ?", categories[i].ID, models.StatusPublished).
			Count(&count)
		categories[i].PostCount = count
	}
	c.JSON(http.StatusOK, categories)
}

// POST /api/categories  (auth)
func (h *CategoryHandler) Create(c *gin.Context) {
	var req CategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	color := req.Color
	if color == "" {
		color = "#6366f1"
	}
	cat := models.Category{
		Name:  req.Name,
		Slug:  slugify(req.Name),
		Color: color,
	}
	if err := database.DB.Create(&cat).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "category already exists"})
		return
	}
	c.JSON(http.StatusCreated, cat)
}

// PUT /api/categories/:id  (auth)
func (h *CategoryHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var cat models.Category
	if err := database.DB.First(&cat, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	var req CategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cat.Name = req.Name
	cat.Slug = slugify(req.Name)
	if req.Color != "" {
		cat.Color = req.Color
	}
	database.DB.Save(&cat)
	c.JSON(http.StatusOK, cat)
}

// DELETE /api/categories/:id  (auth)
func (h *CategoryHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Category{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
