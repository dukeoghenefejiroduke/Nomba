# Nomba Orchestrator // Dashboard Features Guide

[« Back to Root README](../README.md)

This guide details the features available in the Nomba Orchestrator Merchant Console, allowing you to monitor billing health, intervene in payment lifecycles, and simulate scenarios.

---

## 1. Live Metrics Overview (The "At-a-Glance" Panel)
Located at the top of the dashboard, this panel provides real-time financial and operational health markers.

*   **Auto-Recovery Rate (%)**: Measures the percentage of initially failed payments that were successfully recovered by the dunning engine. A higher rate indicates better revenue retention.
*   **Revenue at Risk (₦)**: Total amount of money associated with subscriptions currently in a `past_due` or `failed` state.
*   **Reconciliation Status**: Shows the real-time sync state between the Orchestrator and the Nomba gateway (Synced / Reconciling).

## 2. Billing Lifecycle Funnel (Visual Chart)
Located directly below the metrics, this chart visualizes the payment journey:
*   **Attempts**: Total payment volume.
*   **Failures**: Total initial charge failures.
*   **AuthReq**: Pending authorization requests awaiting user consent.
*   **Recovered**: Successfully rescued payments through automated dunning.

## 3. Active System Jobs (The Task Monitor)
This table displays the real-time queue of pending background tasks scheduled by the Orchestrator.
*   **What it shows**: Jobs waiting for their `scheduledTime` to pass before being picked up by the `jobProcessor`.
*   **Columns**:
    *   **JOB ID**: Unique identifier for the scheduled task.
    *   **TYPE**: The category of the task (e.g., `charge_retry`).
    *   **STATUS**: Always `pending` for visible jobs. Once processed or failed, the job automatically disappears from this list.

### Subscription & Transaction Table
The core operational area for managing individual billing events.

### Filtering
Use the dropdown menu to filter logs by status:
*   **ALL STATUSES**: View all historical and current events.
*   **ACTIVE**: View only healthy, successfully billing subscriptions.
*   **PENDING AUTH**: View subscriptions stalled due to logical failure (e.g., insufficient funds), requiring user intervention.

### Table Columns
*   **ID**: Transaction identifier.
*   **STATUS**: Current subscription lifecycle status.
*   **AMOUNT**: Charge amount in NGN.
* **DURATION**: Time elapsed since subscription creation (e.g., 42h, 3d, 5m).
*   **ACTIONS**: Intervention controls.

### Action Controls (Per-Transaction)
You can intervene in the billing lifecycle directly from the table:

*   **Force Retry**: Available **only** for `PENDING AUTH` transactions. Use this to trigger an immediate re-authorization request if you have reason to believe the customer is ready.
*   **Cancel**: Available for `ACTIVE` or `PENDING` subscriptions. Use this to terminate the billing contract for a specific customer.
*   **Update Card**: Opens a prompt to update the `tokenKey` (linked to the customer's payment method) and sync new email addresses for dunning notifications.

## 5. Simulation Panel
At the bottom of the dashboard, use the simulation controls to test system behavior:
*   **SIMULATE: CREATE SUBSCRIPTION**: Generates a new subscription record in the database and triggers an initial payment attempt.
*   **SIMULATE: TRIGGER REQUERY**: Manually triggers a delta-reconciliation audit to ensure local database records match the payment provider's source of truth.
