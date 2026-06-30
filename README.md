# Nomba Subscription Engine

An autonomous, resilient billing layer for Nigerian merchants, designed to minimize revenue leakage through smart dunning and automated reconciliation.

## 🚀 The Core Problem: Revenue Leakage
Traditional payment collections often fail due to network instability or expired credentials. Without a systematic recovery process, this leads directly to churn and lost revenue.

## 🧠 Intelligent Recovery & Orchestration
Our engine utilizes:
1. **Intelligent Error-Based Dunning**: Categorizes failures and triggers appropriate backoff strategies.
2. **Automated Delta-Reconciliation**: Proactively aligns local ledger with the payment gateway source-of-truth.
3. **Event-Driven Idempotency**: Ensures no transaction is processed twice, even under high-latency network conditions.

## 🖥️ Merchant Command Center (Frontend)
The frontend is a **state-aware, banking-grade console** designed for low-latency merchant operations.
- **Observability**: Real-time visualization of the Billing Lifecycle Funnel and system reconciliation status.
- **Actionable Control**: Direct row-level intervention capabilities (Force Retry, Pause Dunning).
- **Judge-Ready Simulation**: A built-in simulation panel to demonstrate real-time, event-driven state transitions to stakeholders.

## ⚙️ Environment Configuration
To maintain financial transparency and ensure secure, multi-tenant operations, this engine enforces **Parent-Child Account Scoping**:

- **Authentication Scope (`ACCOUNT_ID`)**: All API authentication handshakes are authorized at the **Parent Account** level. This ensures that the engine has the appropriate global administrative scope for token generation.
- **Service Scope (`NOMBA_SUB_ACCOUNT_ID`)**: All financial operations—including creating orders, charging tokens, and performing reconciliation audits—are strictly scoped to the **Sub-Account ID**.

This separation ensures that while the orchestrator has broad administrative access for authentication, every single transaction and log entry is accurately attributed to the specific merchant sub-account, guaranteeing 100% financial transparency and auditability.
