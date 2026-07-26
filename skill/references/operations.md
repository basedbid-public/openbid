# Operations

Use `skill/scripts/openbid-solana.sh` to enforce a consistent validate, dry-run, execute sequence.

## Supported operations

- `solana-create-lbp`
- `solana-create-flash-token`
- `solana-create-board`
- `solana-lbp-buy`
- `solana-lbp-sell`
- `solana-claim-lbp-fees`
- `solana-claim-flash-fees`

## Validate

Validate schema and configuration without API calls or transactions:

```bash
./skill/scripts/openbid-solana.sh validate solana-create-lbp configs/my-lbp.json
```

Validation is the default next action after creating or changing a config.

## Dry-run

Generate the SDK's side-effect-free preview:

```bash
./skill/scripts/openbid-solana.sh dry-run solana-create-lbp configs/my-lbp.json
```

Compare the payload with the reviewed config. Stop on any network, address, amount, recipient, or fee mismatch.

## Execute

After showing the final review summary and receiving approval:

```bash
./skill/scripts/openbid-solana.sh execute solana-create-lbp configs/my-lbp.json --confirm-execute
```

For a mainnet configuration, also require:

```bash
--confirm-mainnet
```

The wrapper rejects execution without these exact flags and removes `SKIP_TX_CONFIRMATION` from the child environment.

## Trades

For buys and sells, verify the mint, amount, units, slippage, network, and expected price impact. Never increase slippage automatically after a failed transaction. Ask the user to approve a changed value.

## Fee claims

Verify whether the address refers to an LBP or Flash Token and choose the matching claim operation. A claim is still an on-chain transaction and requires execution approval.

## Result handling

Capture structured output when available. Report:

- success or failure;
- operation and stage;
- network;
- signature;
- mint, board, or pool address;
- explorer and OpenBid links;
- whether retrying is safe.

Do not report success solely because a transaction was submitted. Use the confirmation status emitted by the SDK.
