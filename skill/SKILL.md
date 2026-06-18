---
name: openbid-solana-launches
description: Design, validate, simulate, and safely execute Solana token launches with OpenBid, including liquidity bootstrapping pools, virtual-liquidity flash launches, white-label launch boards, creator fee routing, trades, and fee claims. Use when a founder or engineer needs to choose a Solana launch model, prepare an OpenBid configuration, compare sustainable revenue structures, validate a launch without side effects, or operate the OpenBid SDK with explicit transaction safety gates.
---

# OpenBid Solana Launches

Help builders turn a token-launch idea into a validated OpenBid configuration and, only with explicit approval, an on-chain Solana operation.

## Operating procedure

1. Classify the request as architecture, configuration, validation, dry-run, or execution.
2. Read only the reference matching the task.
3. Default to Solana devnet and sandbox mode until the user explicitly requests mainnet.
4. Separate advice from execution. Explain economic tradeoffs before generating a config.
5. Validate first, then dry-run, then show the exact network, wallet, assets, fees, and expected side effects.
6. Require explicit approval immediately before every transaction. Never infer approval from an earlier design discussion.
7. Require a second explicit acknowledgement for mainnet execution.
8. Return transaction signatures, addresses, explorer links, and any retryable failure details.

## Route the task

| Request | Read |
| --- | --- |
| Choose between LBP, Flash Token, or Board | [launch-design.md](references/launch-design.md) |
| Configure lifetime revenue or recipient splits | [fee-routing.md](references/fee-routing.md) |
| Build or review JSON configuration | [configuration.md](references/configuration.md) |
| Validate, dry-run, execute, trade, or claim | [operations.md](references/operations.md) |
| Handle wallets, approvals, secrets, or mainnet | [safety.md](references/safety.md) |
| Diagnose a failed SDK or transaction flow | [troubleshooting.md](references/troubleshooting.md) |

## Non-negotiable safety rules

- Never print, request in chat, commit, or transmit a private key.
- Never create a wallet unless the user explicitly asks for one.
- Never set `SKIP_TX_CONFIRMATION=true` for an on-chain operation.
- Never execute from a placeholder or unreviewed config.
- Never silently change the network, board, mint, recipients, fee percentages, slippage, or amounts.
- Treat validation and dry-run as side-effect-free checks. Treat every unflagged SDK operation as potentially state-changing.
- Stop if the transaction preview differs from the reviewed config.

## Preferred command interface

Run the bundled guardrail wrapper from an OpenBid checkout:

```bash
./skill/scripts/openbid-solana.sh validate solana-create-lbp path/to/config.json
./skill/scripts/openbid-solana.sh dry-run solana-create-lbp path/to/config.json
./skill/scripts/openbid-solana.sh execute solana-create-lbp path/to/config.json --confirm-execute
```

For mainnet, require both execution flags:

```bash
./skill/scripts/openbid-solana.sh execute solana-create-lbp path/to/config.json \
  --confirm-execute --confirm-mainnet
```

When the skill is installed outside the SDK checkout, set `OPENBID_SDK_DIR` to the cloned OpenBid repository.

## Response contract

For architecture and configuration work, provide:

- recommended launch type and why;
- assumptions that materially affect economics;
- fee and recipient summary;
- network and sandbox status;
- config path or complete config;
- next safe command, normally validation.

For execution work, additionally provide:

- exact operation and network;
- wallet public address, never the secret;
- assets and maximum amounts at risk;
- approval status;
- signature, created address, and explorer URL on success;
- failed stage, retryability, and safe next step on failure.
