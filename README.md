# Blog Studio

一个简洁、开箱即用的个人博客系统。**Go 后端 + Next.js 前端 + SQLite 数据库**，内容涵盖人文、科技、生活、分享、小说等类目。

---

## 架构一览

```
┌─────────────────────────────────────────────────────────┐
│                     Browser / Client                    │
└─────────────┬───────────────────────┬───────────────────┘
              │ :3000                 │ :3000/admin
              ▼                       ▼
┌─────────────────────────────────────────────────────────┐
│          Next.js 14 (TypeScript + Tailwind CSS)         │
│   公开博客页面 (SSR/ISR)  │  后台管理界面 (CSR)          │
└───────────────────────────┬─────────────────────────────┘
                            │ REST API  :8080
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Go (Gin + GORM)  API Server                │
│  /api/posts  /api/categories  /api/auth  /api/upload    │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  SQLite DB    │
                    │  data/blog.db │
                    └───────────────┘
```

**技术选型**

| 层 | 技术 |
|---|---|
| 前端框架 | Next.js 14 (App Router, TypeScript) |
| 样式 | Tailwind CSS + @tailwindcss/typography |
| Markdown 编辑 | @uiw/react-md-editor |
| Markdown 渲染 | react-markdown + remark-gfm + rehype-highlight |
| 后端框架 | Go + Gin |
| ORM | GORM |
| 数据库 | SQLite（单文件，零运维） |
| 认证 | JWT (golang-jwt/jwt/v5) |
| 容器化 | Docker + docker-compose |

---

## 目录结构

```
blog-studio/
├── backend/                  # Go API 服务
│   ├── main.go               # 入口、路由注册
│   ├── go.mod / go.sum
│   ├── config/config.go      # 环境变量读取
│   ├── database/db.go        # GORM 初始化 + AutoMigrate
│   ├── models/               # 数据模型 (User, Category, Post)
│   ├── handlers/             # 路由处理器
│   │   ├── auth.go           # 登录 / JWT
│   │   ├── posts.go          # 文章 CRUD + 统计
│   │   ├── categories.go     # 分类 CRUD
│   │   └── upload.go         # 图片上传
│   ├── middleware/auth.go    # JWT 认证中间件
│   └── Dockerfile
│
├── frontend/                 # Next.js 前端
│   ├── src/
│   │   ├── app/
│   │   │   ├── (public)/     # 公开页面 (博客+关于)
│   │   │   │   ├── page.tsx       # 首页
│   │   │   │   ├── blog/page.tsx  # 文章列表
│   │   │   │   ├── blog/[slug]/   # 文章详情
│   │   │   │   └── about/         # 关于页
│   │   │   └── admin/             # 后台管理
│   │   │       ├── page.tsx       # 仪表盘
│   │   │       ├── login/         # 登录
│   │   │       ├── posts/         # 文章管理
│   │   │       └── categories/    # 分类管理
│   │   ├── components/
│   │   ├── lib/api.ts         # API 封装层
│   │   ├── lib/auth.ts        # JWT Cookie 工具
│   │   └── types/index.ts     # 共享类型定义
│   └── Dockerfile
│
├── data/                     # SQLite 数据文件 (gitignored)
├── uploads/                  # 上传的图片 (gitignored)
├── scripts/
│   ├── start.sh              # macOS/Linux 一键启动
│   └── start.ps1             # Windows 一键启动
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
└── AGENT.md
```

---

## 首次初始化（必读）

克隆后运行一次以下命令清理多余目录（startup 脚本会自动处理，手动启动时需要执行）：

```bash
# 删除遗留的路由冲突目录
rm -rf frontend/src/app/admin/posts/\[slug\]
```

---

## 快速开始

### 方式 A — 本地开发（推荐）

**前置要求**：Go 1.21+、Node.js 20+

```bash
# 1. 克隆仓库
git clone <your-repo-url>
cd blog-studio

# 2. 复制并编辑配置
cp .env.example .env
# 编辑 .env，至少修改 JWT_SECRET 和 ADMIN_PASSWORD

# 3. 一键启动
# macOS / Linux
bash scripts/start.sh

# Windows (PowerShell)
.\scripts\start.ps1
```

启动后访问：
- 博客首页：http://localhost:3000
- 后台管理：http://localhost:3000/admin
- API 文档：见下方 API 章节

### 方式 B — Docker（生产推荐）

```bash
cp .env.example .env
# 编辑 .env，设置强密码和 JWT_SECRET

docker compose up -d --build
```

服务说明：
- frontend 容器监听 3000 端口
- backend 容器监听 8080 端口
- SQLite 数据文件挂载在 `./data/blog.db`
- 图片上传挂载在 `./uploads/`

---

## 环境变量说明

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `8080` | 后端监听端口 |
| `DB_PATH` | `../data/blog.db` | SQLite 文件路径 |
| `JWT_SECRET` | ⚠️ 请修改 | JWT 签名密钥，生产环境必须改 |
| `ADMIN_USERNAME` | `admin` | 后台登录用户名 |
| `ADMIN_PASSWORD` | `admin123` | 后台登录密码，生产环境必须改 |
| `UPLOAD_DIR` | `../uploads` | 图片上传目录 |
| `MAX_UPLOAD_SIZE_MB` | `10` | 单文件上传大小限制 (MB) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | 前端请求 API 的地址 |
| `FRONTEND_URL` | `http://localhost:3000` | 后端 CORS 白名单 |

---

## API 接口

所有接口前缀 `/api`，需要认证的接口须在 Header 传 `Authorization: Bearer <token>`。

### 认证

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/auth/login` | 登录，返回 JWT token |
| GET | `/auth/me` | 🔒 获取当前登录信息 |

### 文章

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/posts` | 获取文章列表（支持 `page`、`page_size`、`category`、`search`、`status=all`） |
| GET | `/posts/:slug` | 获取文章详情（自动计数阅读量） |
| POST | `/posts` | 🔒 新建文章 |
| PUT | `/posts/:id` | 🔒 更新文章 |
| DELETE | `/posts/:id` | 🔒 删除文章 |

### 分类

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/categories` | 获取分类列表（含文章数） |
| POST | `/categories` | 🔒 新建分类 |
| PUT | `/categories/:id` | 🔒 更新分类 |
| DELETE | `/categories/:id` | 🔒 删除分类 |

### 上传 & 统计

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/upload` | 🔒 上传图片，返回 `{ url: "/uploads/..." }` |
| GET | `/stats` | 🔒 获取仪表盘统计数据 |

---

## 后台功能

- **仪表盘**：文章数、发布数、草稿数、总阅读量
- **文章管理**：列表、搜索、新建/编辑（Markdown 实时预览）、删除
- **分类管理**：新建（含颜色选择）、编辑、删除
- **图片上传**：封面图上传，按年/月组织

---

## 生产部署建议

1. 将 `JWT_SECRET` 设置为 32 位以上随机字符串
2. 修改 `ADMIN_PASSWORD` 为强密码
3. 在反向代理（Nginx / Caddy）前端配置 HTTPS
4. 定期备份 `data/blog.db` 和 `uploads/` 目录
5. 可通过 `NEXT_PUBLIC_API_URL` 配置后端的公网地址

```nginx
# Nginx 示例（前端 + 后端同域）
server {
    server_name yourdomain.com;
    location / { proxy_pass http://localhost:3000; }
    location /api { proxy_pass http://localhost:8080; }
    location /uploads { proxy_pass http://localhost:8080; }
}
```
