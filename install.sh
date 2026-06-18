#!/usr/bin/env bash
# Install OpenBid CLI for local development or remote curl|bash installs.
#
# Remote install:
#   curl -fsSL https://www.based.bid/install.sh | bash
#
# Local install (from a cloned repo):
#   ./install.sh

set -euo pipefail

OPENBID_REPO="https://github.com/basedbid-public/openbid.git"
OPENBID_BRANCH="main"
OPENBID_BIN_DIR="${OPENBID_BIN_DIR:-$HOME/.local/bin}"
DEFAULT_INSTALL_DIR="${HOME}/.local/share/openbid"
CLI_NAME="create-flash-token-base"

err() {
  echo "Error: $*" >&2
  exit 1
}

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "$1 is required but not installed. Install it and rerun install.sh"
  fi
}

is_openbid_checkout() {
  [[ -f "$1/package.json" ]] && grep -q '"name"[[:space:]]*:[[:space:]]*"openbid"' "$1/package.json" 2>/dev/null
}

try_local_install_dir() {
  local script="$1"

  case "$script" in
    bash|sh|-) return 1 ;;
    /dev/fd/*|/dev/stdin) return 1 ;;
  esac

  local script_dir
  script_dir="$(cd "$(dirname "$script")" && pwd)"

  if is_openbid_checkout "$script_dir"; then
    echo "$script_dir"
    return 0
  fi

  return 1
}

resolve_install_dir() {
  local script="${BASH_SOURCE[0]:-$0}"
  local local_dir=""

  if local_dir="$(try_local_install_dir "$script")"; then
    echo "$local_dir"
    return 0
  fi

  echo "${OPENBID_INSTALL_DIR:-$DEFAULT_INSTALL_DIR}"
}

clone_or_update_repo() {
  local install_dir="$1"

  if [[ -d "$install_dir/.git" ]]; then
    echo "Updating openbid in $install_dir..."
    git -C "$install_dir" fetch --depth 1 origin "$OPENBID_BRANCH" \
      || err "git fetch failed for $OPENBID_REPO (branch: $OPENBID_BRANCH)"
    git -C "$install_dir" checkout "$OPENBID_BRANCH" \
      || err "git checkout failed for branch $OPENBID_BRANCH"
    git -C "$install_dir" reset --hard "origin/$OPENBID_BRANCH" \
      || err "git update failed for branch $OPENBID_BRANCH"
    return 0
  fi

  if [[ -e "$install_dir" ]]; then
    err "$install_dir exists but is not an openbid git checkout. Remove it or set OPENBID_INSTALL_DIR to another path."
  fi

  echo "Cloning openbid into $install_dir..."
  git clone --depth 1 --branch "$OPENBID_BRANCH" "$OPENBID_REPO" "$install_dir" \
    || err "git clone failed for $OPENBID_REPO (branch: $OPENBID_BRANCH)"
}

install_npm_dependencies() {
  local install_dir="$1"

  echo "Installing npm dependencies in $install_dir..."
  if ! (cd "$install_dir" && npm install --no-audit --no-fund); then
    err "npm install failed in $install_dir"
  fi

  if [[ ! -d "$install_dir/node_modules" ]]; then
    err "npm install completed but node_modules is missing in $install_dir"
  fi
}

install_cli_on_path() {
  local install_dir="$1"
  local cli_path="$install_dir/bin/$CLI_NAME"
  local bin_link="$OPENBID_BIN_DIR/$CLI_NAME"

  [[ -f "$cli_path" ]] || err "CLI not found at $cli_path"
  chmod +x "$cli_path"

  mkdir -p "$OPENBID_BIN_DIR"
  ln -sf "$cli_path" "$bin_link"
}

get_version_label() {
  local install_dir="$1"

  if git -C "$install_dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    local commit branch tag
    commit="$(git -C "$install_dir" rev-parse --short HEAD 2>/dev/null || echo unknown)"
    branch="$(git -C "$install_dir" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
    tag="$(git -C "$install_dir" describe --tags --exact-match 2>/dev/null || true)"
    if [[ -n "$tag" ]]; then
      echo "$tag ($commit)"
    else
      echo "$commit ($branch)"
    fi
  else
    echo "unknown"
  fi
}

path_contains_bin_dir() {
  case ":${PATH}:" in
    *":${OPENBID_BIN_DIR}:"*) return 0 ;;
    *) return 1 ;;
  esac
}

main() {
  need_cmd git
  need_cmd node
  need_cmd npm

  local install_dir script_dir using_local_checkout=0
  install_dir="$(resolve_install_dir)"

  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || echo "")"
  if [[ -n "$script_dir" && "$script_dir" == "$install_dir" ]] && is_openbid_checkout "$install_dir"; then
    using_local_checkout=1
    echo "Using local openbid checkout at $install_dir"
  else
    clone_or_update_repo "$install_dir"
  fi

  install_npm_dependencies "$install_dir"
  install_cli_on_path "$install_dir"

  local version bin_link
  version="$(get_version_label "$install_dir")"
  bin_link="$OPENBID_BIN_DIR/$CLI_NAME"

  echo ""
  echo "OpenBid CLI installed successfully."
  echo ""
  echo "  Command:  $CLI_NAME"
  echo "  Version:  $version"
  echo "  Binary:   $bin_link"
  echo "  Repo:     $install_dir"
  echo ""
  echo "Example:"
  echo "  $CLI_NAME --yes --token-name \"Name\" --symbol \"SYM\" --description \"Description\""
  echo ""

  if ! path_contains_bin_dir; then
    echo "Add this to your shell profile so $CLI_NAME is on PATH:"
    echo "  export PATH=\"$OPENBID_BIN_DIR:\$PATH\""
    echo ""
  fi

  if [[ "$using_local_checkout" -eq 0 ]]; then
    echo "Re-run this installer to update:"
    echo "  curl -fsSL https://www.based.bid/install.sh | bash"
    echo ""
  fi
}

main "$@"
