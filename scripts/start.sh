#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# blog-studio local development startup script
# Usage: bash scripts/start.sh
# ─────────────────────────────────────────────────────────────
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

# ── Colors ────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[blog-studio]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
info() { echo -e "${BLUE}[info]${NC} $1"; }

# ── Pre-flight checks ─────────────────────────────────────────
command -v go   >/dev/null 2>&1 || { warn "Go not found. Install from https://go.dev/dl/"; exit 1; }
command -v node >/dev/null 2>&1 || { warn "Node.js not found. Install from https://nodejs.org/"; exit 1; }
command -v npm  >/dev/null 2>&1 || { warn "npm not found."; exit 1; }

GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
NODE_VERSION=$(node --version | sed 's/v//')
info "Go $GO_VERSION | Node $NODE_VERSION"

# ── Env file ─────────────────────────────────────────────────
if [ ! -f "$ROOT/.env" ]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  warn ".env not found — copied from .env.example. Edit it before production use."
fi
set -a; source "$ROOT/.env"; set +a

# ── Directories ───────────────────────────────────────────────
mkdir -p "$ROOT/data" "$ROOT/uploads"

# ── Backend ───────────────────────────────────────────────────
log "Installing Go dependencies..."
cd "$BACKEND"
go mod tidy

log "Starting Go backend on :${PORT:-8080}..."
export DB_PATH="$ROOT/data/blog.db"
export UPLOAD_DIR="$ROOT/uploads"
go run . &
BACKEND_PID=$!
info "Backend PID: $BACKEND_PID"

# Wait for backend to be ready
sleep 2
for i in {1..15}; do
  curl -sf "http://localhost:${PORT:-8080}/health" >/dev/null 2>&1 && break
  sleep 1
done

# ── Frontend ──────────────────────────────────────────────────
# Remove stale [slug] directory (routing is handled by [id])
rm -rf "$FRONTEND/src/app/admin/posts/[slug]" 2>/dev/null || true

log "Installing npm dependencies (this may take a minute on first run)..."
cd "$FRONTEND"
npm install --prefer-offline --no-audit --no-fund 2>&1 | tail -5

log "Starting Next.js frontend on :3000..."
NEXT_PUBLIC_API_URL="http://localhost:${PORT:-8080}" npm run dev &
FRONTEND_PID=$!
info "Frontend PID: $FRONTEND_PID"

# ── Summary ───────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Blog Studio is running!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  📖 Blog:   ${BLUE}http://localhost:3000${NC}"
echo -e "  🔧 Admin:  ${BLUE}http://localhost:3000/admin${NC}"
echo -e "  🚀 API:    ${BLUE}http://localhost:${PORT:-8080}/api${NC}"
echo ""
echo -e "  默认账号: admin / ${ADMIN_PASSWORD:-admin123}"
echo ""
echo "  Press Ctrl+C to stop all services."

# ── Cleanup on exit ───────────────────────────────────────────
cleanup() {
  log "Shutting down..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM
wait
