# Nomba Orchestrator (Intelligent Recurring Billing & Revenue Recovery Engine)

## 1. The Problem: The "Revenue Leak" in Emerging Markets
In the current Nigerian fintech landscape, many merchants rely on either manual collection or rigid, "blind" automated billing. This leads to three systemic failures:

* **Involuntary Churn**: Legitimate customers lose access to services due to failed payments caused by transient network issues or expired cards.
* **Operational Inefficiency**: Merchants waste server resources and API costs retrying charges that have zero probability of succeeding (e.g., retrying an expired card).
* **Customer Distrust**: Automated retries without user consent can lead to disputes and chargebacks, damaging the merchant’s relationship with their customers.

## 2. What You Are Building
You are building an Error-Aware, Permission-Based Billing Orchestrator. This is an infrastructure layer that treats payment failures not as simple errors, but as events requiring specific, intelligent handling. Your system transforms the billing lifecycle into a resilient, transparent, and user-centric process.

## 3. How You Plan to Implement It
Your implementation is built on three pillars of "Fintech Hardening":

### Intelligent Dunning & Error Classification
Instead of static, time-based retries, your engine classifies every failure (e.g., TRANSIENT_NETWORK, INSUFFICIENT_FUNDS, HARD_FAILURE). You use an event-driven orchestrator that retries only when appropriate—e.g., immediately for network flickers, or waiting for a "Gateway Restored" signal for infrastructure-level downtime.

### User-Consent & Trust (The "Gatekeeper" Layer)
For logical failures (like insufficient funds), the system transitions to a PENDING_AUTH state. You implement a Retry Authorization Layer where the customer must provide explicit consent before any further charge attempts are made. This builds trust, reduces disputes, and aligns with modern compliance standards like SCA (Strong Customer Authentication).

### Financial Integrity & Reconciliation
You solve the "data drift" problem by building a Delta-Reconciliation Service. Instead of scanning your entire database daily, your system proactively queries the Nomba requery endpoint for specific failed or uncertain transactions. This ensures your local database (PaymentLogs) is always in sync with Nomba’s source-of-truth ledger, providing 100% auditability for the merchant.

### Hardened Infrastructure
* **Atomic Operations**: You prevent race conditions by using MongoDB atomic operators to ensure state transitions are locked and consistent.
* **Idempotency**: You enforce idempotency at every execution layer, ensuring that even if a worker fails or a network hangs, a customer is never double-charged.
* **Graceful Degradation**: If the primary queue system encounters issues, your system uses a local persistence buffer to ensure no payment event is lost.

---

## 🚀 Real-Time Observability & Consistency
Our system provides enterprise-grade observability and guarantees:

- **SSE-Powered Real-Time Dashboard**: The merchant console leverages Server-Sent Events (SSE) for sub-millisecond updates on payment states and recovery success, providing immediate feedback during outages or dunning cycles.
- **Mathematical Consistency**: We implement strict idempotency across all retry workers and API endpoints. The dashboard displays **"SYSTEM CONSISTENCY: IDEMPOTENCY CONFLICTS: 0"** as a guarantee that all state changes are processed once and accurately, ensuring no double-charges regardless of network conditions.

---

## ⚙️ Environment Configuration
To maintain financial transparency and ensure secure, multi-tenant operations, this engine enforces **Parent-Child Account Scoping**:

- **Authentication Scope (`ACCOUNT_ID`)**: All API authentication handshakes are authorized at the **Parent Account** level.
- **Service Scope (`NOMBA_SUB_ACCOUNT_ID`)**: All financial operations—including creating orders, charging tokens, and performing reconciliation audits—are strictly scoped to the **Sub-Account ID**.

---

## 📚 Project Documentation Index

To help you navigate the codebase and understand the design, here is the complete index of our project documentation:

*   **[Core Subscription Engine (Backend README)](nomba-subscription-engine/README.md)**: Details the autonomous billing layer, core problem, state-machine-driven recovery, and smart-dunning backend logic.
*   **[System Architecture](nomba-subscription-engine/ARCHITECTURE.md)**: Outlines the technical architecture, high-level Mermaid sequence, state machine lifecycle transitions, and the resiliency features (idempotency, logging).
*   **[Merchant Console Features (Frontend Guide)](frontend/FEATURES.md)**: Complete guide to the React dashboard interface, real-time observability metrics, billing funnel chart, and merchant simulation panel.
*   **[Project Handoff Summary](nomba-subscription-engine/HANDOFF.md)**: Hackathon handoff guide covering API readiness, local database setup, known bottlenecks, and future scaling pathways (e.g., BullMQ transition).

