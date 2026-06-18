# Project Handoff: Nomba Billing Engine

This file serves as a handoff summary for rapid continuation during the hackathon.

## 1. API Readiness
- **Status:** All endpoints are fully functional using the `nombaService.js` mock layer.
- **Action Required:** When real Nomba API keys are acquired, update `services/nombaService.js` with real `axios` or `fetch` calls to the actual Nomba API endpoints.

## 2. Database & Environment
- **Credentials:** `MONGO_URI` is currently set as an environment variable in the deployment platforms (Render/Vercel). Never hardcode these.
- **Local Dev:** Ensure a local MongoDB instance is running (`mongodb://localhost:27017/nomba-subscription`) if developing locally without the `MONGO_URI` env var.

## 3. Known Bottlenecks & Next Steps
- **Immediate Task:** The automated retry worker is currently implemented as a `setInterval` in `app.js`. For production-scale scaling, swap this for a production-grade task runner like **BullMQ** or **RabbitMQ**.
- **Observability:** Current logs are to `console.log`. Consider integrating a service like **Winston** or **Datadog** if the demo allows, for better judge-facing visibility.
- **Security:** Ensure the signature verification in `webhookController.js` is updated from the static 'secret_token' to a proper HMAC verification using the actual Nomba webhook secret key once provided.
