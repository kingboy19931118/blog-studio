# AGENT.md — Blog Studio 开发指南

> 本文件面向 AI 编程助手（Claude、Copilot 等）以及接手二次开发的工程师。
> 读完本文件即可理解项目全貌，无需逐文件阅读代码。

---

## 项目目标

一个轻量、可自托管的个人博客系统，特点：

- **零外部依赖**：数据库用 SQLite，无需 Redis / MySQL / 云服务
- **内容优先**：简洁 UI，图文并茂，阅读体验好
- **易运维**：单命令启动，单文件数据库，备份简单
- **可扩展**：后端 RESTful API，前端组件化，易于添加新功能

---

## 技术决策记录 (ADR)

| 决策 | 选择 | 原因 |
|---|---|---|
| 后端语言 | Go (Gin) | 二进制体积小、内存低、适合单机部署 |
| 数据库 | SQLite (GORM) | 零配置，单文件备份，个人博客数据量完全够用 |
| 前端框架 | Next.js 14 App Router | SSR/ISR 对 SEO 友好，TypeScript 类型安全 |
| 样式 | Tailwind CSS | 无需自定义 CSS，主题统一，响应式简单 |
| 认证 | JWT (无 refresh token) | 博客后台简单场景，JWT 24h 过期足够 |
| 图片存储 | 本地文件系统 | 简单可靠，生产可替换为对象存储 |

---

## 核心数据模型

```go
// User — 管理员账号（目前仅单用户）
User { ID, Username, Password(bcrypt), CreatedAt, UpdatedAt }

// Category — 文章分类
Category { ID, Name, Slug, Color(hex), CreatedAt, UpdatedAt }

// Post — 文章
Post {
  ID, Title, Slug(unique),
  Summary,       // 摘要，显示在列表卡片
  Content,       // Markdown 正文
  CoverImage,    // /uploads/... 相对路径
  CategoryID,    // FK → Category
  Status,        // "draft" | "published"
  ViewCount,     // 每次 GET /posts/:slug 自动 +1
  CreatedAt, UpdatedAt
}
```

---

## 常见二次开发任务

### 1. 添加新的 API 字段

1. 修改 `backend/models/` 中对应结构体，添加字段
2. GORM AutoMigrate 会在下次启动时自动加列
3. 更新 `backend/handlers/` 中对应的 Create/Update 请求体 struct
4. 更新 `frontend/src/types/index.ts` 中的 TypeScript 类型
5. 在前端组件中使用新字段

### 2. 添加新的后台页面

1. 在 `frontend/src/app/admin/` 下创建新目录和 `page.tsx`
2. 在 `frontend/src/components/admin/Sidebar.tsx` 的 `links` 数组中加入新入口
3. 包裹 `<AuthGuard>` 和 `<Sidebar>` 保持布局一致

### 3. 添加新的公开页面

1. 在 `frontend/src/app/(public)/` 下创建目录和 `page.tsx`
2. 页面会自动继承 Navbar + Footer（来自 `(public)/layout.tsx`）
3. 在 `frontend/src/components/Navbar.tsx` 的 `navLinks` 数组中加导航项

### 4. 替换图片存储为对象存储 (OSS/S3)

修改 `backend/handlers/upload.go` 中的 `Upload` 函数：

```go
// 替换本地存储逻辑
// 1. 读取 file 内容
// 2. 调用 OSS SDK 上传
// 3. 返回 CDN URL 而非相对路径
```

同时更新 `frontend/src/lib/api.ts` 中的 `getImageUrl` 函数，直接返回传入的 URL（已经是绝对路径时无需拼接）。

### 5. 添加多用户支持

1. `backend/models/user.go` 已有 User 模型，可直接扩展
2. 在 Post 模型添加 `AuthorID uint` 字段
3. `backend/handlers/posts.go` 中从 JWT claims 读取 `userID` 并存储
4. 添加用户注册/管理接口

### 6. 添加评论系统

推荐方案 A（外部托管）：集成 Giscus (GitHub Discussions)，在 `blog/[slug]/page.tsx` 末尾加入脚本。

推荐方案 B（自建）：
1. 新增 `Comment` 模型 `{ ID, PostID, AuthorName, AuthorEmail, Content, CreatedAt }`
2. 添加 `GET /api/posts/:id/comments` 和 `POST /api/posts/:id/comments`
3. 前端在文章详情页底部添加评论组件

### 7. 添加文章标签 (Tags)

1. 新增 `Tag { ID, Name, Slug }` 和 `PostTag { PostID, TagID }` 模型
2. Post 模型添加 `Tags []Tag gorm:"many2many:post_tags"`
3. 更新 handlers/posts.go 中 Preload 加入 Tags
4. 前端 PostCard 和详情页展示标签

### 8. SEO 优化

- 文章详情页已有 `generateMetadata` 实现动态 OG tags
- 可在 `frontend/src/app/(public)/layout.tsx` 添加结构化数据 (JSON-LD)
- 可在 `frontend/public/` 添加 `sitemap.xml` 或使用 next-sitemap 包生成动态 sitemap

### 9. RSS Feed

在 `frontend/src/app/(public)/feed.xml/route.ts` 添加 Route Handler：

```typescript
export async function GET() {
  const posts = await fetch(`${API}/api/posts?page_size=20`).then(r => r.json());
  const xml = generateRSS(posts.posts);
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
```

### 10. 全文搜索升级

当前：SQL LIKE 查询（适合小数据量）

升级路径：
- 嵌入 SQLite FTS5 扩展（零依赖，Go 侧修改 GORM 查询）
- 或集成 MeiliSearch / Typesense（需额外服务，搜索体验更好）

---

## 代码风格约定

### Go 后端

- Handler 接受 `*gin.Context`，返回前统一用 `c.JSON(statusCode, payload)`
- 错误格式：`gin.H{"error": "message"}`
- 成功格式：直接返回对应 struct 或 `gin.H{...}`
- 数据库操作用 `database.DB`（包级全局变量）
- 新 Handler 在 `main.go` 的 `api` 路由组中注册

### Next.js 前端

- 公开页面用 Server Component（直接 fetch，利用 ISR 缓存）
- 需要交互/状态的页面用 `'use client'` + hooks
- API 调用统一通过 `@/lib/api.ts` 封装，不要在组件里直接用 `axios`
- 类型定义放 `@/types/index.ts`
- 管理页面必须包裹 `<AuthGuard>`

---

## 已知限制 & 未来改进

| 限制 | 改进方向 |
|---|---|
| 单管理员账号 | 扩展多用户（见上方任务 5） |
| 图片存本地 | 替换为 OSS（见上方任务 4） |
| 无评论功能 | 集成 Giscus 或自建（见上方任务 6） |
| 搜索用 LIKE | 升级 FTS5 或搜索服务（见上方任务 10） |
| 无 RSS | 添加 Route Handler（见上方任务 9） |
| 无草稿预览 | 后台编辑页添加"预览"按钮，临时渲染当前内容 |
| 无图片 Alt 管理 | 上传时允许输入 alt 文本 |

---

## 本地调试技巧

```bash
# 后端单独启动（带实时日志）
cd backend && go run .

# 后端 hot reload（需安装 air）
go install github.com/air-verse/air@latest
cd backend && air

# 前端单独启动
cd frontend && npm run dev

# 查看 SQLite 数据库
sqlite3 data/blog.db ".tables"
sqlite3 data/blog.db "SELECT * FROM posts LIMIT 5;"

# 测试 API
curl http://localhost:8080/health
curl http://localhost:8080/api/posts
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## 文件速查

| 要改什么 | 去哪改 |
|---|---|
| API 接口逻辑 | `backend/handlers/*.go` |
| 数据库表结构 | `backend/models/*.go` |
| 路由注册 | `backend/main.go` |
| 前端 API 调用 | `frontend/src/lib/api.ts` |
| 共享 TypeScript 类型 | `frontend/src/types/index.ts` |
| 导航菜单 | `frontend/src/components/Navbar.tsx` |
| 后台侧边栏 | `frontend/src/components/admin/Sidebar.tsx` |
| 文章卡片样式 | `frontend/src/components/PostCard.tsx` |
| 首页内容 | `frontend/src/app/(public)/page.tsx` |
| 文章详情渲染 | `frontend/src/app/(public)/blog/[slug]/page.tsx` |
| 全局样式 | `frontend/src/app/globals.css` |
| 环境变量 | `.env`（开发）/ docker-compose.yml（容器）|
