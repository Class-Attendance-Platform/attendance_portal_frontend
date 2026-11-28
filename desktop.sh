#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

usage() {
  cat <<'EOF'
HSTU Attendance Portal — Minimal Electron Desktop Helper

Usage:
  ./desktop.sh                 Export web bundle + launch Electron
  ./desktop.sh run [--no-web]  Build web bundle (unless --no-web) and launch
  ./desktop.sh dev             Start Expo web dev server + Electron live-reload
  ./desktop.sh launch          Launch Electron using existing web-build/
  ./desktop.sh bundle [args]   Build standalone AppImage under release/
  ./desktop.sh clean           Remove web-build/ and release/

Environment variables:
  PORTAL_API_URL               Override default backend URL at launch
                               (default: https://attendanceportal.sakibkx.tech)
EOF
}

log() {
  printf '\033[1;32m==>\033[0m %s\n' "$*"
}

err() {
  printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2
  exit 1
}

ensure_deps() {
  command -v node >/dev/null 2>&1 || err "Missing required tool: node"
  command -v npm >/dev/null 2>&1 || err "Missing required tool: npm"
  if [[ ! -d "$SCRIPT_DIR/node_modules/electron" ]]; then
    log "Installing npm dependencies (including prepackaged Electron)..."
    npm install
  fi
}

build_web() {
  log "Exporting Expo web bundle -> web-build/..."
  npm run build
}

CMD="${1:-run}"
shift || true

case "$CMD" in
  -h|--help|help)
    usage
    ;;
  run)
    BUILD_WEB=1
    while (($# > 0)); do
      case "$1" in
        --no-web) BUILD_WEB=0 ;;
        *) err "Unknown option for run: $1" ;;
      esac
      shift
    done
    ensure_deps
    if ((BUILD_WEB == 1)) || [[ ! -f "$SCRIPT_DIR/web-build/index.html" ]]; then
      build_web
    fi
    log "Launching Electron..."
    exec npx electron desktop/main.js
    ;;
  launch)
    ensure_deps
    [[ -f "$SCRIPT_DIR/web-build/index.html" ]] || err "web-build/ not found. Run './desktop.sh' first."
    log "Launching Electron..."
    exec npx electron desktop/main.js
    ;;
  dev)
    ensure_deps
    DEV_URL="${PORTAL_DEV_URL:-http://localhost:8081}"
    log "Starting Expo web dev server..."
    npm run web &
    EXPO_PID=$!
    cleanup() {
      kill "$EXPO_PID" 2>/dev/null || true
    }
    trap cleanup EXIT INT TERM

    log "Waiting for $DEV_URL..."
    for _ in $(seq 1 60); do
      if curl -fsS "$DEV_URL" >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done

    log "Launching Electron against $DEV_URL..."
    PORTAL_DEV_URL="$DEV_URL" npx electron desktop/main.js
    ;;
  bundle)
    ensure_deps
    build_web
    log "Packaging standalone Linux AppImage -> release/..."
    npx electron-builder --linux AppImage "$@"
    log "AppImage created under: $SCRIPT_DIR/release/"
    ;;
  clean)
    log "Cleaning web-build/ and release/..."
    rm -rf "$SCRIPT_DIR/web-build" "$SCRIPT_DIR/release"
    log "Clean complete."
    ;;
  *)
    err "Unknown command: $CMD (run './desktop.sh --help' for usage)"
    ;;
esac
