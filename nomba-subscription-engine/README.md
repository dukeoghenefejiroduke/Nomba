# Nomba Recurring Billing & Churn-Reduction Engine

A robust, resilient backend engine designed to manage recurring subscriptions and reduce involuntary churn through automated dunning (retry) mechanisms.

## Project Structure
- `app.js`: Entry point. Connects DB, configures middleware, and runs the dunning scheduler.
- `models/`: Mongoose schemas (User, Subscription, PaymentLog, Job).
- `services/`: 
  - `nombaService.js`: Mock API interaction layer (with Demo Mode for rapid testing).
  - `dunningService.js`: The "churn-killer" retry logic.
- `controllers/`: API and Webhook handlers.
- `public/`: Lightweight dashboard for demo purposes.

## Key Hackathon Features
1. **Resilient Dunning:** Automated retry queue for failed charges.
2. **State Machine:** Subscription transitions (active, past_due, canceled).
3. **Demo Mode:** Set `DEMO_MODE=true` in `.env` to accelerate retries from 24h+ to 1 minute, making live demos feasible.
4. **Idempotency:** Protects against duplicate charges.

## How to Demo (The Win)
1. **Configure**: Create `.env` file in `nomba-subscription-engine/`:
   ```
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/nomba-subscription
   DEMO_MODE=true
   ```
2. **Run**: `node app.js`
3. **Interact**: Open `http://localhost:3000`
4. **Showcase**: 
   - Enter `amount: 999` to trigger a simulated decline.
   - Watch the logs: see the system automatically transition the subscription to `past_due`.
   - Observe the scheduler: see the automated retry attempt after 60 seconds (thanks to `DEMO_MODE`).
   - Final result: System automates revenue recovery!
