# Recurring Billing & Dunning Engine (Nomba Hackathon Entry)

A production-grade, robust billing engine designed for extreme reliability, accuracy, and handling complex unhappy-path scenarios.

## Fintech Architecture
- **Idempotency Engine**: Mandatory middleware ensures that financial transactions are never processed twice, even under high-latency network retries, by checking an idempotency key against our transactional state store.
- **State Machine & Dunning**: Subscriptions transition through a rigid state machine (`pending`, `active`, `past_due`, `canceled`). The Dunning Service automatically orchestrates payment retries at 24h, 48h, and 72h intervals, logging specific failure reasons (e.g., `insufficient_funds`) to `PaymentLog` for deep analysis.

## Security & Compliance
- **Webhook Integrity**: All incoming webhooks are validated using cryptographic HMAC SHA-256 signatures, ensuring zero tampering by malicious actors. The `webhookController` strictly enforces this before event processing.

## How to Demonstrate the Unhappy Path
To showcase the robustness of this engine to the judges:
1. **Trigger a Payment Failure**: Use a test credit card known to trigger `insufficient_funds`.
2. **Observe State Machine**: Verify the Subscription status in MongoDB changes to `past_due`.
3. **Automated Retries**: Use `npm run dunning` (mocking time) to watch the system automatically retry 3 times.
4. **Reconciliation**: If a charge is actually successful on the Nomba ledger but failed locally, run `node scripts/reconciliation.js` to see the engine detect and remediate the state disparity.
