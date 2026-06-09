package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UploadHandler struct {
	uploadDir       string
	maxSizeMB       int64
}

func NewUploadHandler(uploadDir string, maxSizeMB int64) *UploadHandler {
	return &UploadHandler{uploadDir: uploadDir, maxSizeMB: maxSizeMB}
}

var allowedExts = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true,
	".gif": true, ".webp": true, ".svg": true,
}

// POST /api/upload  (auth)
func (h *UploadHandler) Upload(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, h.maxSizeMB<<20)

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file: " + err.Error()})
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !allowedExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported file type"})
		return
	}

	// Organize by year/month
	now := time.Now()
	subDir := fmt.Sprintf("%d/%02d", now.Year(), now.Month())
	dir := filepath.Join(h.uploadDir, subDir)
	if err := os.MkdirAll(dir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create upload dir"})
		return
	}

	filename := uuid.New().String() + ext
	dst := filepath.Join(dir, filename)

	if err := c.SaveUploadedFile(header, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save file"})
		return
	}

	// Return a URL path the frontend can use
	urlPath := fmt.Sprintf("/uploads/%s/%s", subDir, filename)
	c.JSON(http.StatusOK, gin.H{"url": urlPath})
}
