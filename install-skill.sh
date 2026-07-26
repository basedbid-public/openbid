#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./install-skill.sh --codex
  ./install-skill.sh --claude
  ./install-skill.sh --agents [project-directory]
  ./install-skill.sh --target <skills-directory>
EOF
}

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_name="openbid-solana-launches"
mode="${1:-}"

case "$mode" in
  --codex)
    skills_dir="${CODEX_HOME:-$HOME/.codex}/skills"
    ;;
  --claude)
    skills_dir="$HOME/.claude/skills"
    ;;
  --agents)
    project_dir="${2:-.}"
    skills_dir="$(cd "$project_dir" && pwd)/.agents/skills"
    ;;
  --target)
    if [[ -z "${2:-}" ]]; then usage; exit 2; fi
    mkdir -p "$2"
    skills_dir="$(cd "$2" && pwd)"
    ;;
  *)
    usage
    exit 2
    ;;
esac

target="$skills_dir/$skill_name"
mkdir -p "$target"
cp -R "$repo_dir/skill/." "$target/"
chmod +x "$target/scripts/openbid-solana.sh"

echo "Installed $skill_name to $target"
echo "Set OPENBID_SDK_DIR=$repo_dir when using the installed runner outside this checkout."
