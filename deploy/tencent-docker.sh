#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/xindongOS}"
REPO_URL="${REPO_URL:-https://github.com/373632289-prog/xindongOS.git}"
PORT="${PORT:-8080}"

if [ -z "${MODEL_API_KEY:-}" ]; then
  echo "MODEL_API_KEY is required. Run with MODEL_API_KEY=your-key sh deploy/tencent-docker.sh"
  exit 1
fi

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    sudo "$@"
  fi
}

install_docker() {
  if need_cmd docker; then
    return
  fi

  if need_cmd apt-get; then
    as_root apt-get update
    as_root apt-get install -y ca-certificates curl gnupg git
    curl -fsSL https://get.docker.com | as_root sh
  elif need_cmd yum; then
    as_root yum install -y yum-utils git curl
    curl -fsSL https://get.docker.com | as_root sh
  else
    echo "Unsupported Linux distribution. Please install Docker and git manually."
    exit 1
  fi

  as_root systemctl enable docker || true
  as_root systemctl start docker || true
}

install_git() {
  if need_cmd git; then
    return
  fi
  if need_cmd apt-get; then
    as_root apt-get update
    as_root apt-get install -y git
  elif need_cmd yum; then
    as_root yum install -y git
  fi
}

install_git
install_docker

as_root mkdir -p "$APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  as_root rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

cat > /tmp/xindongos.env <<EOF
MODEL_PROVIDER=${MODEL_PROVIDER:-google}
MODEL_API_URL=${MODEL_API_URL:-https://agentllm.linkyun.co/v1beta/google}
MODEL_API_KEY=${MODEL_API_KEY}
MODEL_NAME=${MODEL_NAME:-nano-banana-pro-preview}
PORT=${PORT}
EOF

as_root mv /tmp/xindongos.env "$APP_DIR/.env"
as_root chmod 600 "$APP_DIR/.env"

as_root docker build -t xindongos "$APP_DIR"
as_root docker rm -f xindongos >/dev/null 2>&1 || true
as_root docker run -d \
  --name xindongos \
  --restart unless-stopped \
  --env-file "$APP_DIR/.env" \
  -p "${PORT}:${PORT}" \
  xindongos

echo "xindongOS is running at: http://$(hostname -I | awk '{print $1}'):${PORT}"
