# Final Submission Checklist

## Phase 1: Problem Definition ("The Reliability Gap")
- [ ] **Draft Narrative:** Explicitly articulate that recurring billing fails when gateways provide no context, leading to involuntary churn.
- [ ] **Link to Code:** Reference `services/failedTransactionProcessor.js` as the direct implementation that fills this gap by turning "failed" attempts into "scheduled, managed retry jobs."

## Phase 2: Technical Differentiation ("Beyond the Brief")
- [ ] **Document Intelligence:** Explain your error handling architecture.
- [ ] **Reference Classifier:** Highlight `services/errorClassifier.js` to demonstrate that the system does not "blindly retry."
- [ ] **Explain Reputation Protection:** Detail how distinguishing between `TRANSIENT_NETWORK` (retryable) and `HARD_FAILURE` (terminal, e.g., `INSUFFICIENT_FUNDS`) prevents merchant API bans due to spamming terminal errors.

## Phase 3: The "Proof of Work" (Simulation & Demo)
- [ ] **Demo Path:** Define a clear flow through the customer portal (`controllers/portalController.js`).
- [ ] **Prepare Test Cases:** Use `handleRetryAuthorization` to simulate a failure and show how the system automatically handles the state transition.
- [ ] **Visualize:** Use the portal to show the difference in `PaymentLog` status before and after the triggered retry.

## Phase 4: Reconciliation Argument ("Source of Truth")
- [ ] **Define Value Proposition:** Explain that "connectivity is never guaranteed," making local state inherently untrustworthy.
- [ ] **Reference Reconciliation:** Point to `services/reconciliationService.js` (Delta-Reconciliation).
- [ ] **Explain Mechanism:** Clearly describe how the service fetches external data (`nombaService`) and reconciles it against the local `PaymentLog` model to ensure complete data integrity.
