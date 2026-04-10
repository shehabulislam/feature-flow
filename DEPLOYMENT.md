# FeatureFlow — Deployment Guide

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ (or a hosted Postgres like Supabase, Neon, or Fly Postgres)

---

## Quick Start (Local Development)

```bash
# 1. Clone and install
git clone https://github.com/shehabulislam/feature-flow.git
cd feature-flow
npm install

# 2. Start PostgreSQL (using Docker)
docker compose up db -d

# 3. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL if not using Docker Compose defaults

# 4. Push schema to database
npm run db:push

# 5. Start dev server
npm run dev
```

The app runs at **http://localhost:3000**

---

## Deploy to Vercel

1. **Push to GitHub** and import the repo in [Vercel](https://vercel.com)

2. **Set up a PostgreSQL database**:
   - [Supabase](https://supabase.com) (free tier available)
   - [Neon](https://neon.tech) (free tier available)
   - Any PostgreSQL provider

3. **Add environment variables** in Vercel dashboard:
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   AUTH_SECRET=<run: openssl rand -base64 32>
   NEXTAUTH_URL=https://your-domain.vercel.app
   ```

4. **Deploy** — Vercel auto-detects Next.js. The `postinstall` script generates Prisma client automatically.

5. **Initialize database** — After first deploy, run:
   ```bash
   npx prisma db push
   ```
   Or connect to the database and run the SQL from `prisma/schema.prisma`.

---

## Deploy to Fly.io

```bash
# 1. Install Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Launch the app
fly launch --no-deploy

# 3. Create a Postgres database
fly postgres create --name featureflow-db
fly postgres attach featureflow-db

# 4. Set secrets
fly secrets set AUTH_SECRET=$(openssl rand -base64 32)
fly secrets set NEXTAUTH_URL=https://your-app.fly.dev

# 5. Deploy
fly deploy
```

The Dockerfile handles everything — it builds the app and runs `prisma db push` on startup.

---

## Self-Hosted (Docker Compose)

```bash
# 1. Clone the repo
git clone https://github.com/shehabulislam/feature-flow.git
cd feature-flow

# 2. Configure
cp .env.example .env
# Edit .env — set AUTH_SECRET to a random string

# 3. Start everything
docker compose up -d
```

This starts:
- **PostgreSQL** on port 5432
- **FeatureFlow** on port 3000

The app auto-migrates the database on startup.

---

## Self-Hosted (Manual / VPS)

```bash
# 1. Install dependencies
npm install

# 2. Set up PostgreSQL and configure .env
cp .env.example .env
# Edit DATABASE_URL to point to your PostgreSQL instance

# 3. Push schema
npm run db:push

# 4. Build
npm run build

# 5. Start
npm run start
```

Use a process manager like **PM2** for production:
```bash
npm install -g pm2
pm2 start npm --name "featureflow" -- start
pm2 save
pm2 startup
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | Random secret for JWT signing |
| `NEXTAUTH_URL` | ✅ | Your app's public URL |
| `STRIPE_SECRET_KEY` | ❌ | Stripe API key (for billing) |
| `STRIPE_WEBHOOK_SECRET` | ❌ | Stripe webhook signature secret |
| `STRIPE_PRO_PRICE_ID` | ❌ | Stripe price ID for Pro plan |
| `STRIPE_TEAM_PRICE_ID` | ❌ | Stripe price ID for Team plan |
| `NEXT_PUBLIC_STRIPE_ENABLED` | ❌ | Set to `"true"` to enable billing UI |

---

## Database Commands

```bash
npm run db:push       # Push schema changes (no migration history)
npm run db:migrate    # Create and apply migrations
npm run db:studio     # Open Prisma Studio (visual DB editor)
npm run db:generate   # Regenerate Prisma client
```

---

## Super Admin

The super admin email is configured in `src/lib/superadmin.ts`:
```typescript
export const SUPER_ADMIN_EMAIL = "accounts@bplugins.com";
```

Change this to your preferred email before deploying.
