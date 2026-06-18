# Safety

Apply these controls to every workflow involving keys, assets, or on-chain state.

## Permission boundary

Treat the following as separate user decisions:

1. design a launch;
2. create or modify a configuration;
3. validate;
4. dry-run;
5. execute on devnet;
6. execute on mainnet.

Approval for an earlier step does not authorize a later step.

## Wallet handling

- Request only a public address when discussing ownership or recipients.
- Direct the user to set private material locally in `.env`.
- Never echo `.env` or run commands that print private keys.
- Prefer an existing devnet wallet for testing.
- Use a dedicated low-balance operational wallet for first mainnet runs.
- Recommend multisig or governed custody for shared treasuries.

## Execution gates

Before asking for execution approval, show:

- network and sandbox status;
- payer public key;
- operation;
- assets and maximum amount at risk;
- destination contracts or mint;
- fee routes;
- slippage;
- expected number of transactions.

Ask for approval only after a successful validation and dry-run generated from the same unchanged config.

## Mainnet

For mainnet, explicitly state that real assets may be spent and transactions may be irreversible. Require the wrapper's `--confirm-mainnet` gate in addition to `--confirm-execute`.

## Configuration integrity

If a config changes after approval, invalidate the approval and repeat validation, dry-run, summary, and confirmation.

## Failure handling

Do not repeatedly resubmit an unknown transaction. Check whether a signature exists and whether it landed before retrying. Never solve insufficient funds, slippage, or API errors by broadening risk parameters without fresh approval.
