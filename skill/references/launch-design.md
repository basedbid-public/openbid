# Launch design

Choose the launch primitive before discussing individual fields.

## Decision table

| Need | Prefer | Reason |
| --- | --- | --- |
| Price discovery and a graduation threshold | LBP | A bonding curve can bootstrap distribution before DEX graduation. |
| Immediate DEX trading without waiting for a curve | Flash Token | Virtual liquidity supports an immediate market. |
| A branded launch surface for a community, KOL, or agency | Board | A board curates projects and can share revenue across its launches. |
| One project plus an owned distribution channel | Board, then LBP or Flash Token | Separate launch infrastructure from the token's launch mechanism. |

## Discovery questions

Ask only for information that changes the recommendation:

1. Is immediate trading required, or is staged price discovery acceptable?
2. Is the builder launching one token or operating a repeat launch program?
3. What outcome should fees fund: creator income, liquidity, buybacks, rewards, marketing, or a treasury?
4. Is the first run devnet or mainnet?
5. Is a custom board already available, and does it require an API key?

## LBP guidance

Prefer an LBP when distribution and a visible graduation target matter. Review:

- market-cap target;
- total supply and decimals;
- initial purchase;
- per-wallet allocation limits;
- allowlist requirements;
- graduation DEX and fee tier;
- post-graduation revenue policy.

Do not claim that an LBP prevents all sniping or guarantees fair distribution. Describe configured limits precisely.

## Flash Token guidance

Prefer a Flash Token when speed and immediate DEX availability dominate. Review:

- virtual liquidity assumptions;
- initial price inputs;
- fee tier;
- dynamic-fee setting;
- creator and treasury routing;
- risks created by shallow real liquidity.

Do not describe virtual liquidity as deposited capital. Explain that execution quality and price impact still depend on market conditions and configuration.

## Board guidance

Prefer a Board for repeat operators. Review:

- branding and curation policy;
- who may launch;
- listing and trading fees;
- board owner and recipient wallets;
- partner API-key requirements;
- whether projects retain clear control over their own economics.

Frame Boards as launch infrastructure, not merely a category page.

## Recommendation format

Return one primary recommendation and, when useful, one alternative. Include:

- why it fits;
- what it gives up;
- the three parameters with the largest economic impact;
- the next devnet validation step.
