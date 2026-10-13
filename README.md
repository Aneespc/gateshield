# GateShield

> A zero-trust access gateway that evaluates every request against identity, device posture, location and time before it reaches your apps.

GateShield is an open-source zero-trust access gateway and reverse proxy built in TypeScript. It demonstrates central policy enforcement, default deny, fail-closed behavior, policies as data, and a comprehensive audit trail: evaluating every request against identity, device posture, location, and time-of-day context before proxying traffic to upstream applications.

## Status
**Status:** Step 7 Complete — Believable internal dummy upstream apps (HR, Finance, Admin) with bypass protection, link normalization, and simulated stateful actions.

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
- **Authentication Age & Step-Up:** Policies can require fresh logins (`authAgeMinutes <= 15`). Stale sessions trigger `STEP_UP`, redirecting users to a timing-safe verification challenge.
- **Comprehensive Audit Trail:** All access evaluations record context snapshots and explicit decision rationales.

## Demo Guide & Verification Scenarios

Note: The protected dummy applications (`/apps/hr`, `/apps/finance`, `/apps/admin`) simulate realistic internal upstream corporate tools using static fictional data; they are strictly protected by shared secret bypass checks and are not reachable directly without passing through the gateway.

Visit `/login` to sign in using pre-configured persona cards, and navigate to `/demo` to open the live simulation console.

### Demo Personas
- **Alice Admin** (`admin@gateshield.local`, role: `admin`): Full administrative privileges, subject to business hours (09:00–18:00 UTC), device compliance, and session freshness.
- **Bob Finance** (`finance@gateshield.local`, role: `finance`): Granted access to Finance Hub if device posture is secure.
- **Carol HR** (`hr@gateshield.local`, role: `hr`): Granted access to HR Portal.
- **Dave Intern** (`intern@gateshield.local`, role: `intern`): Minimal privileges (default denied on protected apps).

### Interactive Simulation Console (`/demo`)
- **Device Posture Toggle:** Instantly toggle between Managed/Compliant (encrypted, EDR active) and Unmanaged/Insecure.
- **Age My Login (+30m):** Simulates session staleness to trigger step-up policies without waiting.
- **Country Override:** Force simulated geolocation to `US`, `DE`, `IN`, `RU`, or `CN` (or reset to live resolution).
- **Time Override:** Force simulated UTC time of day (e.g., `12:00` for inside business hours, `22:00` for after-hours).
- **Live Audit Feed:** View your last 10 gateway requests with timestamps, matched policies, and decisions.

### Five Target Verification Scenarios

| Scenario | Setup Steps | Target App | Expected Outcome | Rationale / Matched Policy |
| :--- | :--- | :--- | :--- | :--- |
| **1. Fresh Admin Access** | Sign in as **Alice Admin**, ensure device is Secure, default fresh login ($\le 15$m), time inside 09:00–18:00 UTC. | `/apps/admin` | **`ALLOW` (200)** | Matches Priority 10: Admin fresh login rule. |
| **2. Stale Admin Step-Up** | From `/demo`, click **Age my login by 30 min**. Then visit `/apps/admin`. | `/apps/admin` | **`STEP_UP` $\rightarrow$ `/reauth`** | Matches Priority 20: Stale session rule. Submitting demo code `123456` resets auth age and redirects back to `/apps/admin` with **`ALLOW`**. |
| **3. Admin Outside Hours** | In `/demo`, set time override to **`22:00`**. | `/apps/admin` | **`DENY` (403)** | Business hours check fails (09:00–18:00 UTC). Default deny takes effect. |
| **4. Admin Insecure Device** | In `/demo`, toggle device posture to **Insecure / Unmanaged**. | `/apps/admin` | **`DENY` (403)** | `deviceSecure == true` condition fails. Default deny takes effect. |
| **5. Finance on Admin App** | Sign in as **Bob Finance**. Visit `/apps/admin`. | `/apps/admin` | **`DENY` (403)** | Role restriction fails (`role in ["admin"]`). Default deny takes effect. |

## Known Limitations (Threat Model Context)
- **Simulated Identity & Posture:** Identity and device security posture are simulated via signed session cookies and local demo controls for interactive testing and demonstration. In production, this requires an enterprise IdP (e.g., Okta, Entra ID) with OIDC/SAML, and an endpoint posture agent (e.g., CrowdStrike Falcon, osquery, or enterprise MDM) reporting mTLS-signed device posture tokens. Client-supplied headers are never trusted.
- **Simulation Isolation (`DEMO_MODE`):** Simulation controls are active only when `DEMO_MODE=true`. In non-demo production environments, simulation overrides are strictly ignored.
- **Step-Up Challenge:** Uses a simulated code (`DEMO_STEP_UP_CODE=123456`) with a 5-attempt lockout and timing-safe verification. In production, this would be an out-of-band push notification or FIDO2/WebAuthn hardware key challenge.
- **No WebSockets / Streaming:** The reverse proxy is designed for standard HTTP request/response flows; WebSockets and long-lived bidirectional streams are not supported.
- **No HTML/Cookie Rewriting:** The proxy does not rewrite internal links, form actions, or domain-scoped cookies within response payloads.
- **Vercel Serverless Execution Limits:** Gateway requests are subject to serverless execution timeouts (10-15s), making it unsuitable for long-running transfers.

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
