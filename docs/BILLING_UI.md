# Task 14 / Task 104 — Billing UI (ANTITODE Admin Dashboard)

System → **Billing** opens `BillingView`.

## Behaviour

- Loads `GET /AdminRoutes/billing/usage|plans|history|subscription`
- **Subscribe** → `POST /billing/subscribe` then Razorpay Checkout (`checkout.js`) with `subscription_id`
  - Re-fetches `/AdminRoutes/billing/usage` after Checkout closes to verify activation.
- **Switch plan** → `POST /billing/change-plan`
- **Cancel at period end** → `POST /billing/cancel`
- **Role Permissions**: Mutating operations (Subscribe, Switch, Cancel) require Customer Administrator permissions (`rbac.users.manage`). Non-admin roles receive a view-only state with action buttons hidden and informative permission notice.
- Platform staff see a note indicating platform accounts have unrestricted access without customer quotas.

## Env

```bash
VITE_RAZORPAY_KEY_ID=rzp_test_...   # public Key ID only — never the secret
VITE_BACKEND_URL=http://localhost:3000
```

Key CSVs stay gitignored (`*razorpay*keys*.csv`).
