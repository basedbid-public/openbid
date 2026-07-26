# Fee routing

Translate a business model into an explicit, reviewable fee policy.

## Start with objectives

Classify each proposed recipient:

- creator income;
- liquidity support;
- buybacks;
- holder rewards;
- marketing or partner payroll;
- custom recipient;
- DAO or multisig treasury.

Do not invent recipient addresses. Use placeholders during planning and block execution until every placeholder is replaced and verified.

## Review checklist

For each route, state:

1. recipient or internal destination;
2. percentage and denominator;
3. payout asset;
4. collection threshold;
5. authority able to change it;
6. operational or market risk.

Check that percentages satisfy the SDK schema and the selected launch/DEX constraints. Use the code's Zod schemas as the source of truth when documentation and implementation disagree.

## Economic pressure test

Before recommending a structure, test:

- low, expected, and high daily volume;
- gross fees versus creator/partner receipts;
- whether liquidity allocations leave enough sustainable revenue;
- whether rewards create a compliance or operational burden;
- whether a partner paid in project tokens may become a forced seller;
- whether thresholds create long collection delays at low volume.

Use scenarios, not promises. Revenue equals realized volume multiplied by the applicable fee and route share. It is not guaranteed.

## Example planning table

| Route | Share | Asset | Purpose | Main risk |
| --- | ---: | --- | --- | --- |
| Creator | 40% | SOL | Ongoing builder income | Key management |
| Liquidity | 25% | Protocol-defined | Market depth | Capital may not be recoverable |
| Buyback | 15% | SOL | Market support | Timing and execution policy |
| Marketing | 10% | SOL or stable asset where supported | Recurring distribution | Recipient disclosure |
| Treasury | 10% | SOL | Operations | Governance and custody |

Treat this as a design example, not an assertion that every field or payout asset is available in every OpenBid Solana flow.

## Output

Return both:

- a plain-language policy suitable for founder review;
- the exact SDK fields that implement it, verified against the current schema.
