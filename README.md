# Zero Trust Gateway (ztgate)

A mini zero-trust access gateway and reverse proxy built in TypeScript. Designed as a portfolio project demonstrating core zero-trust principles: never trust by default, fail closed on any error, evaluate every request against identity, device posture, location, and time-of-day context, and record an immutable audit log for every decision.

## Status
**Status:** Work in progress (Skeleton milestone complete).

## Stack
- **Framework:** [React Router v7](https://reactrouter.com/) (framework mode) with TypeScript (strict)
- **Database & ORM:** PostgreSQL on [Neon](https://neon.tech/) with [Prisma ORM](https://www.prisma.io/) (pooled URL for runtime, direct URL for migrations)
- **Validation:** [Zod](https://zod.dev/)
- **Testing:** [Vitest](https://vitest.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Deployment Target:** [Vercel](https://vercel.com/) (using `@vercel/react-router`)

## Architecture Highlights
- **Default Deny:** Requests are blocked unless explicitly permitted by an enabled policy.
- **Fail Closed:** Any runtime error, malformed policy JSON, or database disruption safely defaults to `DENY`.
- **Pure Policy Engine:** `evaluate(context, policies)` is a deterministic pure function with zero database, network, or framework dependencies.
- **Policies as Data:** Stored as validated JSON conditions evaluated with first-match-wins priority.
- **Comprehensive Audit Trail:** All access evaluations record context snapshots and explicit decision rationales.

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy the example environment configuration to your local `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in your actual values:
- `DATABASE_URL`: Neon pooled PostgreSQL connection string (for application runtime)
- `DIRECT_URL`: Neon direct PostgreSQL connection string (for Prisma migrations)
- `SESSION_SECRET`: A secure random string (at least 32 characters)
- `GATEWAY_SHARED_SECRET`: Shared secret header used to verify gateway-routed traffic

### 3. Generate Prisma Client
```bash
npm run db:generate
```

### 4. Run Migrations & Seed Database
Once your Neon credentials are added to `.env`:
```bash
npm run db:migrate
npm run db:seed
```

### 5. Run the Development Server
```bash
npm run dev
```

### 6. Run Quality Checks & Tests
```bash
npm run test
npm run typecheck
npm run build
```
