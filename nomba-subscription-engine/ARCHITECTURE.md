# System Architecture

The Nomba Billing Engine is designed for high resilience and churn recovery.

## High-Level Flow

```mermaid
graph TD
    Client[Client/Merchant] -->|POST /subscriptions| API[Express API - Idempotency Check]
    API -->|Create| Sub[Subscription Model]
    API -->|Charge| Nomba[Nomba API Service]
    
    Nomba -->|Success| Active[Subscription: Active]
    Nomba -->|Failure| PastDue[Subscription: Past Due]
    
    PastDue -->|Create Job| Queue[Dunning Queue (MongoDB)]
    Queue -->|Retry via Scheduler| Nomba
    Nomba -->|Success| Active
    Nomba -->|Max Retries Reached| Canceled[Subscription: Canceled]
```

## Architectural Components

1.  **State Machine:** Manages `active`, `past_due`, and `canceled` states, ensuring the subscription lifecycle is clearly defined.
2.  **Churn-Reduction Engine (Dunning):** 
    - Automatically captures failed charges in a `Job` collection.
    - Implements an exponential back-off strategy (24h/48h/72h).
    - Includes a **Demo Mode** to accelerate retries for rapid visualization.
3.  **Idempotency Layer:** Uses persistent MongoDB records to ensure requests with the same `x-idempotency-key` are not processed twice, protecting against network retries.
4.  **Resilient Logging:** Detailed `PaymentLog` records with failure `reason` fields, providing full transparency for merchant auditing.
