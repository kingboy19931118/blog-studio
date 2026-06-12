package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"blog-studio/backend/database"
	"blog-studio/backend/models"

	"github.com/gin-gonic/gin"
)

type PostHandler struct{}

func NewPostHandler() *PostHandler { return &PostHandler{} }

type PostRequest struct {
	Title      string            `json:"title" binding:"required"`
	Summary    string            `json:"summary"`
	Content    string            `json:"content"`
	CoverImage string            `json:"cover_image"`
	CategoryID *uint             `json:"category_id"`
	Status     models.PostStatus `json:"status"`
}

type PostsResponse struct {
	Posts      []models.Post `json:"posts"`
	Total      int64         `json:"total"`
	Page       int           `json:"page"`
	PageSize   int           `json:"page_size"`
	TotalPages int           `json:"total_pages"`
}

// GET /api/posts
func (h *PostHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	category := c.Query("category") // slug
	search := c.Query("search")
	status := c.Query("status") // empty = published only (public), "all" = all (admin)

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	query := database.DB.Model(&models.Post{}).Preload("Category")

	// Public endpoint only shows published posts unless admin requests all
	if status == "all" {
		if _, authenticated := c.Get("userID"); !authenticated {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required for all posts"})
			return
		}
		// allowed (caller must be authenticated — route-level guard)
	} else {
		query = query.Where("status = ?", models.StatusPublished)
	}

	if category != "" {
		var cat models.Category
		if err := database.DB.Where("slug = ?", category).First(&cat).Error; err == nil {
			query = query.Where("category_id = ?", cat.ID)
		} else {
			query = query.Where("1 = 0")
		}
	}

	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(title) LIKE ? OR LOWER(summary) LIKE ?", like, like)
	}

	var total int64
	query.Count(&total)

	var posts []models.Post
	query.Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&posts)

	totalPages := int(total) / pageSize
	if int(total)%pageSize != 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, PostsResponse{
		Posts:      posts,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	})
}

// GET /api/posts/:slug
func (h *PostHandler) Get(c *gin.Context) {
	slug := c.Param("slug")
	var post models.Post
	if err := database.DB.Preload("Category").Where("slug = ?", slug).First(&post).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
		return
	}
	// Increment view count
	database.DB.Model(&post).UpdateColumn("view_count", post.ViewCount+1)
	c.JSON(http.StatusOK, post)
}

// POST /api/posts  (auth)
func (h *PostHandler) Create(c *gin.Context) {
	var req PostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Status == "" {
		req.Status = models.StatusDraft
	}

	slug := generateSlug(req.Title)

	post := models.Post{
		Title:      req.Title,
		Slug:       slug,
		Summary:    req.Summary,
		Content:    req.Content,
		CoverImage: req.CoverImage,
		CategoryID: req.CategoryID,
		Status:     req.Status,
	}

	if err := database.DB.Create(&post).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	database.DB.Preload("Category").First(&post, post.ID)
	c.JSON(http.StatusCreated, post)
}

// PUT /api/posts/:id  (auth)
func (h *PostHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var post models.Post
	if err := database.DB.First(&post, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
		return
	}

	var req PostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	post.Title = req.Title
	post.Summary = req.Summary
	post.Content = req.Content
	post.CoverImage = req.CoverImage
	post.CategoryID = req.CategoryID
	if req.Status != "" {
		post.Status = req.Status
	}

	database.DB.Save(&post)
	database.DB.Preload("Category").First(&post, post.ID)
	c.JSON(http.StatusOK, post)
}

// DELETE /api/posts/:id  (auth)
func (h *PostHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Post{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

// GET /api/stats  (auth)
func (h *PostHandler) Stats(c *gin.Context) {
	var totalPosts, published, drafts int64
	database.DB.Model(&models.Post{}).Count(&totalPosts)
	database.DB.Model(&models.Post{}).Where("status = ?", models.StatusPublished).Count(&published)
	database.DB.Model(&models.Post{}).Where("status = ?", models.StatusDraft).Count(&drafts)

	var totalViews int64
	database.DB.Model(&models.Post{}).Select("COALESCE(SUM(view_count), 0)").Scan(&totalViews)

	var totalCategories int64
	database.DB.Model(&models.Category{}).Count(&totalCategories)

	c.JSON(http.StatusOK, gin.H{
		"total_posts":      totalPosts,
		"published":        published,
		"drafts":           drafts,
		"total_views":      totalViews,
		"total_categories": totalCategories,
	})
}

func generateSlug(title string) string {
	base := slugify(title)
	if base == "" {
		base = fmt.Sprintf("post-%d", time.Now().UnixMilli())
	}
	// Ensure uniqueness
	slug := base
	for i := 1; ; i++ {
		var count int64
		database.DB.Model(&models.Post{}).Where("slug = ?", slug).Count(&count)
		if count == 0 {
			break
		}
		slug = fmt.Sprintf("%s-%d", base, i)
	}
	return slug
}
