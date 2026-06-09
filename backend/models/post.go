package models

import "time"

type PostStatus string

const (
	StatusDraft     PostStatus = "draft"
	StatusPublished PostStatus = "published"
)

type Post struct {
	ID         uint       `gorm:"primarykey" json:"id"`
	Title      string     `gorm:"not null" json:"title"`
	Slug       string     `gorm:"uniqueIndex;not null" json:"slug"`
	Summary    string     `json:"summary"`
	Content    string     `gorm:"type:text" json:"content"`
	CoverImage string     `json:"cover_image"`
	CategoryID *uint      `json:"category_id"`
	Category   *Category  `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Status     PostStatus `gorm:"default:'draft'" json:"status"`
	ViewCount  int64      `gorm:"default:0" json:"view_count"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}
