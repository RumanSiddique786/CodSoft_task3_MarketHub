# MarketHub — Multi-Vendor E-Commerce Marketplace

A working full-stack marketplace: customers browse and buy from multiple vendors,
vendors manage products/orders from their own dashboard, admins approve vendors
and oversee the platform.

**Stack:** Next.js 14 (App Router) · NestJS · PostgreSQL · Prisma · Redis (ready to wire in) · AWS S3 (presigned uploads) · JWT auth with RBAC

---

## 0. Prerequisites

Install these first:
- **Node.js** v18+ → https://nodejs.org
- **Docker Desktop** (for Postgres + Redis) → https://www.docker.com/products/docker-desktop
- A code editor (VS Code recommended)
- (Optional, for image uploads) An AWS account + S3 bucket, or skip this feature initially

Check versions:
```bash
node -v
npm -v
docker -v
```

---

## 1. Get the code onto your machine

If you received this as a zip, extract it. Then:

```bash
cd markethub
```

Initialize git and push to your own GitHub repo (per your internship instructions, name it `CODSOFT_TASK<N>`):
```bash
git init
git add .
git commit -m "Initial commit: MarketHub scaffold"
git branch -M main
git remote add origin https://github.com/<your-username>/CODSOFT_TASK1.git
git push -u origin main
```

---

## 2. Start the database and Redis (Docker)

From the project root (`markethub/`):
```bash
docker compose up -d
```
This starts:
- PostgreSQL on `localhost:5432` (user: `markethub`, password: `markethub_pass`, db: `markethub`)
- Redis on `localhost:6379`

Check they're running:
```bash
docker ps
```

---

## 3. Backend setup (NestJS API)

```bash
cd api
npm install
```

Create your `.env` file from the example:
```bash
cp .env.example .env
```
The defaults already match the Docker Postgres above, so you usually don't need to edit `DATABASE_URL`. **Do** change `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to any random strings.

Run the first migration (creates all tables from `prisma/schema.prisma`):
```bash
npx prisma migrate dev --name init
```

Generate the Prisma client (usually automatic after migrate, but run explicitly if needed):
```bash
npx prisma generate
```

Seed demo data (admin, vendor, customer accounts + 2 products):
```bash
npx ts-node prisma/seed.ts
```
This prints demo logins — remember them:
- `admin@demo.com` / `password123`
- `vendor@demo.com` / `password123`
- `customer@demo.com` / `password123`

Start the API in dev mode:
```bash
npm run start:dev
```
It runs on **http://localhost:4000/api**. Test it:
```bash
curl http://localhost:4000/api/products
```
You should see the 2 seeded products as JSON.

**Optional — inspect your database visually:**
```bash
npx prisma studio
```

---

## 4. Frontend setup (Next.js)

Open a **new terminal tab** (keep the API running in the other one):
```bash
cd markethub/web
npm install
cp .env.local.example .env.local
npm run dev
```
Visit **http://localhost:3000**. You should see the seeded products on the homepage.

Try the full flow:
1. Go to `/login`, log in as `customer@demo.com`
2. Click a product → Buy Now → an order is created (stock decrements)
3. Log out, log in as `vendor@demo.com` → go to `/vendor/dashboard` → see the order under the "Orders" tab, update its status
4. Log in as `admin@demo.com` → go to `/admin/dashboard` → see vendors and platform-wide orders

---

## 4.5 Stripe Payments Setup

Payments use **Stripe Checkout** (hosted payment page) + a **webhook** that confirms payment server-side. This is the correct, secure pattern — the client never gets to tell your backend "payment succeeded."

**Step 1 — Get test API keys**
1. Create a free account at https://dashboard.stripe.com/register
2. Make sure you're in **Test mode** (toggle top-right of the dashboard)
3. Go to **Developers → API keys**, copy the **Secret key** (starts with `sk_test_`)
4. Paste it into `api/.env` as `STRIPE_SECRET_KEY`

**Step 2 — Install the Stripe CLI (for local webhook testing)**

Webhooks need a public URL, but you're running locally — the Stripe CLI solves this by forwarding events to your machine.

Windows (via winget, run in PowerShell):
```powershell
winget install stripe.stripe-cli
```
Or download directly from https://github.com/stripe/stripe-cli/releases (grab the `_windows_x86_64.zip`, extract, and add the folder to your PATH).

**Step 3 — Log in and start forwarding**
```powershell
stripe login
stripe listen --forward-to localhost:4000/api/payments/webhook
```
This prints a webhook signing secret like `whsec_...` — **copy it** into `api/.env` as `STRIPE_WEBHOOK_SECRET`.

Leave this `stripe listen` command running in its own terminal window the whole time you're testing payments — it's your local stand-in for Stripe calling your webhook.

**Step 4 — Install the new dependency and restart the API**
```powershell
cd api
npm install
npm run start:dev
```

**Step 5 — Test a full payment**
1. Log in as `customer@demo.com`, open a product, click **Buy Now**
2. You'll be redirected to Stripe's hosted checkout page
3. Use Stripe's test card: `4242 4242 4242 4242`, any future expiry date, any CVC, any ZIP
4. On success, Stripe redirects you to `/checkout/success` — watch the `stripe listen` terminal, you should see a `checkout.session.completed` event logged
5. The order's status should flip to `PAID` within a couple seconds (the success page polls for this automatically)

**Common issues:**
| Problem | Fix |
|---|---|
| Order stays "pending" forever on success page | `stripe listen` isn't running, or `STRIPE_WEBHOOK_SECRET` in `.env` doesn't match the one it printed |
| `Webhook signature verification failed` | You copied the wrong secret, or restarted `stripe listen` (it generates a new secret each time) without updating `.env` |
| Checkout redirects to Stripe but fails immediately | Check `STRIPE_SECRET_KEY` is set and starts with `sk_test_` |

---

## 5. What's already wired up vs. what you should add next

**Already working:**
- JWT auth (access + refresh tokens) with role-based route guards (CUSTOMER / VENDOR / ADMIN)
- Vendor onboarding (register as vendor → PENDING → admin approves)
- Vendor-scoped product CRUD (a vendor can only touch their own products)
- Order placement that splits into **per-vendor OrderItems** — the core marketplace design
- **Stripe Checkout payments**, confirmed server-side via webhook — never trusts the client to say "I paid"
- Vendor dashboard: sales summary, product management, order fulfillment (update item status)
- Admin dashboard: approve/suspend vendors, set commission %, platform-wide order view
- S3 presigned-upload endpoint (`POST /api/upload/presign`) — wire this into the "Add Product" form to support real image uploads

**You should add next (see the original build guide for full details):**
1. **Product image uploads in the vendor form:** call `POST /api/upload/presign`, PUT the file directly to the returned `uploadUrl`, then save `publicUrl` into the product's `images` array.
2. **Redis caching:** cache the `/products` listing (it's read far more than written) and cart state.
3. **Email notifications:** use BullMQ + Redis to queue "order confirmed" / "new order for vendor" emails, triggered from `PaymentsService.handleWebhook` once payment is confirmed.
4. **Reviews UI:** the backend model supports reviews; add a simple POST-review form on the product page.
5. **Category management UI:** right now categories must be created via Prisma Studio or a quick seed — add an admin UI for it.
6. **Tests:** add Jest unit tests for `OrdersService.create` (stock checks, per-vendor splitting) and `PaymentsService.handleWebhook` (signature verification, idempotency) — these are the most "interesting" pieces of logic to test, and webhook idempotency in particular is a great interview talking point (what happens if Stripe sends the same event twice?).

---

## 6. Deployment (when ready)

- **Frontend:** push to GitHub → import into Vercel → set `NEXT_PUBLIC_API_URL` to your deployed API URL
- **Backend:** deploy to Railway or Render → set the same env vars as your `.env` (point `DATABASE_URL` at a hosted Postgres like Neon or Supabase, and Redis at Upstash)
- Run `npx prisma migrate deploy` (not `migrate dev`) against your production database

---

## 7. Common issues

| Problem | Fix |
|---|---|
| `Can't reach database server` | Make sure `docker compose up -d` is running and `DATABASE_URL` in `.env` matches |
| `401 Unauthorized` on protected routes | You're not logged in, or your token expired — log in again |
| CORS errors in browser console | Confirm the API is running on port 4000 and `NEXT_PUBLIC_API_URL` in `.env.local` points to it |
| Vendor can't add products | The vendor must be `APPROVED` by an admin first — log in as admin and approve them |
| `prisma generate` errors | Delete `node_modules` and `package-lock.json`, then `npm install` again |

---

Built as part of the CODSOFT Full Stack Web Development internship.
