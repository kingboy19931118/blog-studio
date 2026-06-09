package models

import "time"

type Category struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	Name      string    `gorm:"uniqueIndex;not null" json:"name"`
	Slug      string    `gorm:"uniqueIndex;not null" json:"slug"`
	Color     string    `gorm:"default:'#6366f1'" json:"color"` // Tailwind-compatible hex
	PostCount int64     `gorm:"-" json:"post_count"`            // computed
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
