#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  openbid-solana.sh validate <operation> <config.json>
  openbid-solana.sh dry-run <operation> <config.json>
  openbid-solana.sh execute <operation> <config.json> --confirm-execute [--confirm-mainnet]

Set OPENBID_SDK_DIR when this skill is installed outside an OpenBid checkout.
EOF
}

mode="${1:-}"
operation="${2:-}"
config="${3:-}"
shift_count=0
if [[ -n "$mode" ]]; then shift_count=$((shift_count + 1)); fi
if [[ -n "$operation" ]]; then shift_count=$((shift_count + 1)); fi
if [[ -n "$config" ]]; then shift_count=$((shift_count + 1)); fi
shift "$shift_count"

case "$mode" in
  validate|dry-run|execute) ;;
  *) usage; exit 2 ;;
esac

case "$operation" in
  solana-create-lbp|solana-create-flash-token|solana-create-board|solana-lbp-buy|solana-lbp-sell|solana-claim-lbp-fees|solana-claim-flash-fees) ;;
  *) echo "Unsupported Solana operation: $operation" >&2; exit 2 ;;
esac

if [[ -z "$config" || ! -f "$config" ]]; then
  echo "Config file not found: ${config:-<missing>}" >&2
  exit 2
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_candidate="$(cd "$script_dir/../.." && pwd)"
sdk_dir="${OPENBID_SDK_DIR:-$repo_candidate}"

if [[ ! -f "$sdk_dir/package.json" || ! -f "$sdk_dir/src/helpers/run.ts" ]]; then
  echo "OpenBid SDK not found at $sdk_dir" >&2
  echo "Set OPENBID_SDK_DIR to a cloned basedbid-public/openbid repository." >&2
  exit 2
fi

config="$(cd "$(dirname "$config")" && pwd)/$(basename "$config")"
is_mainnet="$(node -e 'const fs=require("fs"); const c=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); process.stdout.write(String(c.chainId===501));' "$config")"

confirm_execute=false
confirm_mainnet=false
for arg in "$@"; do
  case "$arg" in
    --confirm-execute) confirm_execute=true ;;
    --confirm-mainnet) confirm_mainnet=true ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

flags=()
case "$mode" in
  validate) flags+=(--validate) ;;
  dry-run) flags+=(--dry-run) ;;
  execute)
    if [[ "$confirm_execute" != true ]]; then
      echo "Execution blocked: pass --confirm-execute only after explicit user approval." >&2
      exit 3
    fi
    if [[ "$is_mainnet" == true && "$confirm_mainnet" != true ]]; then
      echo "Mainnet execution blocked: pass --confirm-mainnet after a second explicit acknowledgement." >&2
      exit 3
    fi
    ;;
esac

cd "$sdk_dir"
unset SKIP_TX_CONFIRMATION
exec npx ts-node ./src/helpers/run.ts "$operation" "$config" "${flags[@]}"
