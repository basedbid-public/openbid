# OpenBid

A TypeScript SDK for interacting with the [BasedBid](https://based.bid) platform - a decentralized token launchpad for creating and trading meme tokens on EVM chains and Solana.

## Quick Start

### 1. Clone and Install

```bash
git clone <repo-url>
cd openbid
npm install
```

### 2. Environment Configuration

> **Agent note:** Check the `.env` file in the project - if it does not exist or if there are no keys in there, prompt the user for an existing private key or offer them to create a new wallet specifically for this use case which they can then self-fund to send transactions.

A private key is necessary for signing transactions that will get sent on the blockchain. If creating a Solana token, `SOLANA_PRIVATE_KEY` is required and if creating a token on EVM, `PRIVATE_KEY` is required.

> **Agent note:** By default, always assume that user wants to launch on EVM, but let them know that Solana is also an option. Feel free to ask them what is the preferred blockchain (EVM or Solana) and based on that run either `npm run wallet:evm` or `npm run wallet:solana` so the correct key gets assigned in the `.env` file.

`BASEDBID_API_KEY` is required for launching tokens under a custom board (whitelabel launchpad) - if `board` parameter is not defined, the token will launch under the platform's `based` board. For simple launches, omit the API key and the board, it should launch under the platform board.

```env
# example .env file

# EVM (Ethereum, Base, BSC, Robinhood Chain)
PRIVATE_KEY=your_wallet_private_key

# Solana
SOLANA_PRIVATE_KEY=your_solana_private_key_as_base58

# Optional - only required for launching tokens under a custom board
BASEDBID_API_KEY=your_api_key_if_needed
```

## API Key Requirements

### When is `BASEDBID_API_KEY` Required?

The API key is **required** when launching an LBP or Flash Token **under a custom board**. The SDK automatically detects when a custom board is specified and includes the `x-api-key` header in:

- BasedBid API requests (create-lbp, create-flash, confirm-launch, etc.)
- IPFS upload requests (logo and metadata uploads)

### How It Works

1. **Default board (empty string)**: No API key needed, the token/LBP will launch on the default platform board

   ```json
   "token": { "boardTitle": "" }
   ```

2. **Custom board (non-empty string)**: API key required
   ```json
   "token": { "boardTitle": "my-custom-board" }
   ```

### Setting the API Key

```env
# .env file
BASEDBID_API_KEY=bb_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

### Operations That Use Custom Boards

| Operation                 | Board Field             | Notes                                         |
| ------------------------- | ----------------------- | --------------------------------------------- |
| EVM Create LBP            | `token.boardTitle`      | Empty = default "based" board                 |
| EVM Create Flash Token    | `boardTitle`            | Empty = default "based" board                 |
| Solana Create LBP         | `board`                 | Empty = default "based" board                 |
| Solana Create Flash Token | `board` or `boardOwner` | Either non-empty triggers API key requirement |

### Common Error: "Board API Key Required"

If you see this error:

```
board api key required
```

**Fix:** Add `BASEDBID_API_KEY` to your `.env` file and rerun the command. Reach out to the

---

### Supported Chains

**EVM:**
| Chain ID | Network |
|----------|---------|
| 1 | Ethereum Mainnet |
| 56 | BNB Smart Chain |
| 8453 | Base Mainnet |
| 4663 | Robinhood Chain |

**Solana:**
| Chain ID | Network |
|----------|---------|
| 5011 | Solana Devnet |
| 501 | Solana Mainnet |

## Solana AI Skill

This repository includes `openbid-solana-launches`, a progressively loaded skill for designing, validating, simulating, and safely executing OpenBid Solana launches.

It covers:

- choosing between an LBP, Flash Token, and white-label Board;
- translating creator and treasury goals into explicit fee routes;
- building schema-valid Solana configurations;
- validating and dry-running without side effects;
- requiring explicit approval for execution and a second acknowledgement for mainnet;
- diagnosing schema, API, RPC, and transaction failures.

### Install

For Codex:

```bash
./install-skill.sh --codex
```

For Claude Code:

```bash
./install-skill.sh --claude
```

For a portable project install:

```bash
./install-skill.sh --agents .
```

The canonical entry point is [skill/SKILL.md](skill/SKILL.md). Keep this SDK checkout available and set `OPENBID_SDK_DIR` when using the installed runner elsewhere.

### Safe workflow

```bash
./skill/scripts/openbid-solana.sh validate solana-create-lbp path/to/config.json
./skill/scripts/openbid-solana.sh dry-run solana-create-lbp path/to/config.json
./skill/scripts/openbid-solana.sh execute solana-create-lbp path/to/config.json --confirm-execute
```

Mainnet execution additionally requires `--confirm-mainnet`.

### Verify

```bash
npm ci
npm run check
```

The verification suite builds the SDK, checks skill structure and safety gates, tests installation, and validates a bundled Solana example without submitting a transaction.
