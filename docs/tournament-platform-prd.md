
# eTourney — Tournament Platform PRD (Backend)

## 1) Vision
A tournament platform where players can discover tournaments, view details publicly, and **unlock participation** by paying an entry fee. The platform supports **wallet top-ups and tournament payments** via **Stripe** (card) and **crypto**. Admins can approve users to become **Game Creators**, enabling them to register games and ship an SDK used by Unity/WebGL games to sync gameplay data into PostgreSQL, powering leaderboards, match history, and analytics.

## 2) Product Goals
- Fast onboarding: sign up, login, password recovery.
- Clear tournament lifecycle: draft → scheduled → running → completed.
- Public tournament pages: anyone can see info; only paid users can participate.
- Payments: Stripe + crypto, with auditable transactions.
- Game creator program: admin approval workflow; creators can register games + SDK credentials.
- Reliable data ingestion from games: authenticated SDK calls, idempotent writes, observability.

## 3) Non-Goals (for initial release)
- Full-blown matchmaking across multiple game genres.
- Real-time game server orchestration.
- Fraud detection beyond basic controls (rate limits, signature checks, anti-replay).

## 4) Architecture Principles
### 4.1 DDD + SOLID
Use a layered structure:
- **Domain**: entities, value objects, domain services, domain events.
- **Application**: use-cases (commands/queries), DTOs, ports (interfaces).
- **Infrastructure**: Prisma repositories, Stripe/crypto providers, email, cache.
- **Interface (HTTP)**: Fastify routes/controllers, Zod validation, error mapping.

Golden rules:
- HTTP layer is thin; it only validates + calls use-cases.
- Use-cases depend on interfaces (ports), not Prisma/Stripe directly.
- Domain is framework-agnostic.

### 4.2 Validation & Errors (Zod)
- Every request body/query/params is validated with Zod.
- Central error handler maps:
  - `ZodError` → `400` with structured details.
  - Domain errors → `409/422`.
  - Auth errors → `401/403`.
- Response DTOs are also Zod-validated in critical flows (payments/webhooks/SDK).

### 4.3 Bounded Contexts
1. **Identity & Access**
	- Users, roles, sessions/tokens, password recovery.
2. **Tournaments**
	- Tournament lifecycle, participation, bracket/matches.
3. **Payments & Wallet**
	- Wallet ledger, transactions, Stripe/crypto providers, webhooks.
4. **Games & Creators**
	- Game registry, creator approvals, SDK credentials.
5. **Game Data Ingestion**
	- SDK events, leaderboards, analytics counters.

## 5) User Roles & Permissions
- **USER**: can view tournaments, pay, participate, view own wallet/transactions.
- **ADMIN**: can approve tournaments and creator status, moderate games.
- **GAME_CREATOR** (recommended as a role or capability flag): can register games, manage SDK keys, view game analytics.

Permission model should be explicit (policy checks) rather than scattered `if` statements.

## 6) Core Functional Requirements

### 6.1 Authentication
**Sign up**
- Create account with email + password.
- Password stored as strong hash (e.g., bcrypt/argon2).
- Email uniqueness enforced.

**Login**
- Returns access token (JWT) and optionally refresh token.
- Rate-limit login attempts.

**Recover password**
- Request password reset (email).
- Store reset token (hashed), expiry, single-use.
- Confirm reset with token + new password.

### 6.2 Tournaments & Paid Access
**Public visibility**
- Tournament details are readable without payment.
- Public includes: name, game, dates, fee, prize pool, format, max participants, status.

**Participation gating**
- To join/participate, user must have a successful payment (or wallet balance) for that tournament.
- Rules:
  - User can view info always.
  - User can only join if payment is confirmed and tournament status allows joining.
  - Joining creates `Participant` record.

### 6.3 Wallet & Payments
Wallet acts as a ledger:
- Credits: Stripe top-up success, crypto deposit confirmations, admin adjustments.
- Debits: tournament entry fee, withdrawals (future).

Payment options:
- **Stripe**: Payment Intent, webhook-driven confirmation.
- **Crypto**: provider-agnostic (e.g., Coinbase Commerce / BitPay) with webhook confirmation.

Requirements:
- Every money movement must create immutable ledger entries.
- Payments must be idempotent (webhooks can retry).
- Webhook endpoints must verify signatures.

### 6.4 Game Creator Approval & Game Registry
Workflow:
1. User requests creator status (or admin manually grants).
2. Admin reviews request and approves.
3. User gains `GAME_CREATOR` capability.
4. Creator can register a game:
	- name, genre, description, active flag.
	- generates SDK credentials: `clientId` + secret/API key.

### 6.5 SDK Data Flow (Unity/WebGL)
**Overall Data Flow**
1. Unity/WebGL game calls SDK methods.
2. SDK sends authenticated requests to backend endpoints.
3. Backend validates signature + schema and persists to PostgreSQL.
4. Backend services compute/serve leaderboards/history/analytics.

SDK requirements:
- Auth: HMAC signature (timestamp + body) or short-lived token minted by backend.
- Anti-replay: timestamp window + nonce.
- Idempotency: eventId uniqueness.
- Rate limiting per game key.

## 7) Data Model (Prisma) — Current & Next
Current schema already has: `User`, `Game`, `Tournament`, `Participant`, `Match`, `TournamentRequest`.

Planned additions (suggested):
- `Wallet` (1:1 User)
- `LedgerEntry` / `WalletTransaction`
- `Payment` (provider, status, externalId, amount, currency)
- `TournamentPurchase` (userId, tournamentId, paymentId/status)
- `PasswordResetToken`
- `UserCapability` or `role` expansion for `GAME_CREATOR`
- `GameApiKey` (gameId, hashedSecret, status, lastUsedAt)
- `SdkEvent` (gameId, userId?, type, payload, eventId, createdAt)
- `Leaderboard` materialization strategy (either computed queries or snapshots)

Note: keep money values as `Decimal` in DB.

## 8) API Surface (High-Level)
### Identity
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /me`

### Tournaments
- `GET /tournaments` (public)
- `GET /tournaments/:id` (public)
- `POST /tournaments` (organizer/admin depending on policy)
- `POST /tournaments/:id/join` (requires paid access)

### Wallet & Payments
- `GET /wallet`
- `GET /wallet/transactions`
- `POST /wallet/topup/stripe` (creates Stripe intent)
- `POST /wallet/topup/crypto` (creates crypto invoice/address)
- `POST /webhooks/stripe`
- `POST /webhooks/crypto`

### Admin / Approvals
- `POST /admin/creator-requests/:id/approve`
- `POST /admin/tournament-requests/:id/approve`

### Games & SDK
- `POST /games` (game creators)
- `POST /games/:id/keys` (rotate keys)
- `POST /sdk/events` (game SDK ingestion)
- `GET /games/:id/leaderboard`

## 9) Development Plan (Phased)

### Phase 0 — Foundation (Project & DevOps)
**Goal:** run the whole stack locally with one command and have a repeatable build for production.


- [x] Define environment variables
	- Create `.env.example` with:
		- `DATABASE_URL`
		- `PORT`, `HOST`
		- `JWT_SECRET`
		- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
		- `CRYPTO_PROVIDER`, `CRYPTO_WEBHOOK_SECRET`
		- `MAIL_PROVIDER`, `MAIL_PROVIDER_*`
	- Define a “required env vars” check at boot (fail fast).
	- Acceptance:
		- App refuses to start with missing secrets (clear error message).

- [x] Create Docker setup (dev)
	- Add `docker-compose.yml`:
		- `postgres` service (volume for data, exposed port, healthcheck).
		- optional `pgadmin` service (dev only).
	- Add backend `Dockerfile`:
		- Multi-stage: deps → build → runtime.
		- Runtime runs compiled JS (not tsx).
	- Add `.dockerignore`.
	- Align scripts:
		- Ensure `build` emits to `dist/` and `start` runs `node dist/server.js`.
	- Acceptance:
		- `docker compose up` boots Postgres.
		- `docker build .` succeeds and container starts.

- [x] Add health endpoints
	- `GET /health` returns `{ status: 'ok' }`.
	- `GET /health/db` checks DB connectivity.
	- Acceptance:
		- Health endpoints respond under 200ms locally.

- [x] Observability baseline
	- Add correlation id (request id) and structured logging.
	- Add basic request logging (method, url, statusCode, durationMs).
	- Acceptance:
		- Logs include request id and are JSON.

### Phase 1 — HTTP Layer + Error Handling
**Goal:** make the HTTP layer consistent, validated, and predictable.

- [x] Fastify plugins setup
	- Create an HTTP “composition root”:
		- register plugins: CORS, rate limiting, sensible defaults.
		- register routes by module (auth, tournaments, wallet, admin, games, sdk).
	- Acceptance:
		- App boots with a single `buildApp()` entrypoint.

- [x] Zod request validation
	- Add `zod` dependency.
	- Create a small helper for:
		- validating `body`, `params`, `query`.
		- returning typed input to controllers.
	- Define a standard error shape:
		- `{ error: { code: string, message: string, details?: unknown } }`.
	- Acceptance:
		- Invalid payloads return `400` with Zod issues.

- [x] Central error handler
	- Create error classes:
		- `DomainError`, `AuthError`, `NotFoundError`, `ConflictError`.
	- Map them to status codes.
	- Ensure “unknown error” becomes `500` with safe message.
	- Acceptance:
		- No stack traces leak in responses.

### Phase 2 — Identity & Access
**Goal:** secure authentication with clean boundaries and recoverability.

- [x] Domain model
	- Create `User` entity with invariants:
		- email format normalized, name required.
	- Value objects:
		- `Email`, `PasswordHash`.
	- Acceptance:
		- Domain forbids invalid emails/password hashes.

- [x] Ports (interfaces)
	- `UsersRepository` (find by email/id, create, update).
	- `PasswordHasher` (hash, compare).
	- `TokenService` (sign, verify) for JWT.
	- Acceptance:
		- Use-cases depend only on ports.

- [x] Use-cases
	- `RegisterUser`:
		- validate uniqueness, hash password, persist.
	- `AuthenticateUser`:
		- validate credentials, issue token.
	- `GetMe`:
		- returns current user profile.
	- Acceptance:
		- Register + login flows work end-to-end.

- [x] HTTP routes
	- `POST /auth/register` (Zod body).
	- `POST /auth/login` (Zod body).
	- `GET /me` (JWT required).
	- Acceptance:
		- Unauthorized calls get `401`.

- [x] Password recovery
	- Data model:
		- `PasswordResetToken` (hashed token, userId, expiresAt, usedAt).
	- Ports:
		- `Mailer` (sendResetLink).
	- Use-cases:
		- `RequestPasswordReset` (create token, email it).
		- `ResetPassword` (validate token/expiry, set new hash, mark used).
	- Acceptance:
		- Token is single-use and expires.

- [x] Security hardening
	- Rate limit login and reset flows.
	- Add audit logs (minimal): login success/failure, password reset request.
	- Acceptance:
		- Brute-force attempts are throttled.

### Phase 3 — Tournaments (Read + Create)
**Goal:** a tournament can be created and browsed publicly.

- [x] Domain model
	- `Tournament` entity with invariants:
		- `startDate` required, `endDate` optional but >= start.
		- `fee` and `prizePool` as money (Decimal).
		- status transitions are valid.
	- Acceptance:
		- Invalid transitions throw domain errors.

- [x] Use-cases (public read)
	- `ListTournaments` (filters: game, status, date range).
	- `GetTournamentDetails`.
	- Acceptance:
		- Routes are public and paginated.

- [x] Use-cases (write)
	- `CreateTournament`.
	- `UpdateTournament` (limited fields depending on status).
	- `ChangeTournamentStatus`.
	- Acceptance:
		- Only authorized roles can create/update.

- [x] HTTP routes
	- `GET /tournaments`.
	- `GET /tournaments/:id`.
	- `POST /tournaments`.
	- `PATCH /tournaments/:id`.
	- `POST /tournaments/:id/status`.

### Phase 4 — Wallet (Ledger) + Stripe
**Goal:** users can top up with Stripe, and the wallet is auditable.

- [x] Data model (Prisma)
	- Add:
		- `Wallet` (userId unique).
		- `LedgerEntry` (walletId, type CREDIT/DEBIT, amount Decimal, currency, reason, referenceId, createdAt).
		- `Payment` (provider, status, externalId, amount Decimal, currency, metadata JSON).
		- `WebhookEvent` (provider, externalId unique, payload JSON) for idempotency.
	- Acceptance:
		- Unique constraints prevent double-crediting.
	- Notes:
		- Prisma migration exists but must be applied with a running Postgres.

- [x] Ports
	- `WalletRepository`.
	- `StripeProvider`:
		- create payment intent, verify webhook.
	- Acceptance:
		- Application layer never imports Stripe SDK directly.

- [x] Use-cases
	- `GetWallet`:
		- ensure wallet exists, return balance and currency.
	- `ListWalletTransactions`.
	- `CreateStripeTopUpIntent`:
		- returns client secret and payment id.
	- `HandleStripeWebhook`:
		- verify signature, persist webhook event, credit wallet exactly once.
	- Acceptance:
		- Retried webhooks do not duplicate credits.

- [x] HTTP routes
	- `GET /wallet` (auth required).
	- `GET /wallet/transactions`.
	- `POST /wallet/topup/stripe`.
	- `POST /webhooks/stripe` (public, signature-verified).

### Phase 5 — Crypto Payments
**Goal:** support crypto top-ups without coupling to a single provider.

- [ ] Provider abstraction
	- Define `CryptoPaymentProvider` port:
		- create invoice (amount/currency), verify webhook, fetch invoice status.
	- Implement one provider (choose later).
	- Acceptance:
		- Swapping provider doesn’t affect use-cases.

- [ ] Use-cases
	- `CreateCryptoTopUpInvoice`:
		- returns payment reference + checkout url/address.
	- `HandleCryptoWebhook`:
		- verify signature, persist webhook event, credit wallet exactly once.
	- Acceptance:
		- Webhook is idempotent.

- [ ] HTTP routes
	- `POST /wallet/topup/crypto`.
	- `POST /webhooks/crypto`.

- [ ] Reconciliation (optional but recommended)
	- Scheduled job:
		- checks pending crypto payments and updates status.
	- Acceptance:
		- A missed webhook can still be recovered.

### Phase 6 — Paid Tournament Access & Participation
**Goal:** tournament participation is unlocked by payment.

- [x] Data model
	- Add `TournamentPurchase`:
		- `userId`, `tournamentId` unique
		- `status` (PENDING/PAID/FAILED/REFUNDED)
		- `paymentId?` (Stripe/crypto), `paidAt?`
	- Acceptance:
		- One purchase per user per tournament.
	- Notes:
		- Prisma migration exists but must be applied with a running Postgres.

- [x] Use-cases
	- `PurchaseTournamentEntry`:
		- validates tournament exists and status allows purchase.
		- if wallet has balance: debit + mark paid.
		- if Stripe: create payment intent referencing tournament.
	- `ConfirmTournamentEntryPayment`:
		- triggered by payment webhook → marks purchase as PAID.
	- `JoinTournament`:
		- checks purchase is PAID, creates participant.
	- Acceptance:
		- A paid user can join once; unpaid user gets `403`.

- [x] HTTP routes
	- `POST /tournaments/:id/purchase`.
	- `POST /tournaments/:id/join`.

- [x] Policy rules
	- Anyone can view.
	- Only paid users can join.
	- Joining blocked when tournament is RUNNING/COMPLETED/CANCELED.

### Phase 7 — Admin Approvals (Tournament & Creator)
**Goal:** admins can control who can create tournaments and who can publish games.

- [x] Tournament request flow
	- Use-cases:
		- `CreateTournamentRequest` (user).
		- `ReviewTournamentRequest` (admin approve/reject + notes).
		- `ApproveTournamentRequestCreatesTournament` (optional automatic creation).
	- Acceptance:
		- Status changes tracked with reviewer info.

- [x] Creator approval flow
	- Data model option:
		- Extend `UserRole` or add `UserCapability`.
	- Use-cases:
		- `RequestCreatorStatus`.
		- `ApproveCreatorStatus`.
	- Acceptance:
		- Approved user can access game endpoints.
	- Notes:
		- Prisma migration exists but must be applied with a running Postgres.

- [x] HTTP routes
	- `POST /creator-requests` (user).
	- `POST /admin/creator-requests/:id/approve`.
	- `POST /admin/tournament-requests/:id/approve`.
	- `POST /admin/tournament-requests/:id/reject`.

### Phase 8 — Games & SDK Credentials
**Goal:** game creators can register games and get SDK keys.

- [x] Game registration
	- Use-case: `CreateGame` (creator only).
	- Validations:
		- unique name per game (already in schema).
	- Acceptance:
		- A game is created and visible in tournaments.

- [x] SDK key management
	- Data model:
		- `GameApiKey` with `clientId`, `secretHash`, `status`, `createdAt`, `lastUsedAt`.
	- Use-cases:
		- `CreateGameApiKey`.
		- `RotateGameApiKey` (revokes old key, creates new).
		- `RevokeGameApiKey`.
	- Acceptance:
		- Secret is only shown once (at creation).

- [ ] Quotas and rate limits
	- Rate limiting per `clientId`.
	- Payload size limits for SDK endpoints.
	- Acceptance:
		- Abusive keys are throttled.

### Phase 9 — SDK Data Ingestion (Events → Postgres)
**Goal:** ingest gameplay events safely and use them to power leaderboards/history.

- [x] Define SDK contract
	- Zod schemas for event types:
		- `SESSION_STARTED`, `SESSION_ENDED`
		- `SCORE_UPDATED`
		- `MATCH_RESULT`
		- `CUSTOM`
	- Shared envelope:
		- `eventId`, `gameClientId`, `timestamp`, `nonce`, `type`, `payload`.
	- Acceptance:
		- Any malformed event is rejected with a clear `400`.

- [x] Authentication & anti-replay
	- Signature scheme:
		- HMAC over `timestamp + nonce + rawBody`.
	- Verify:
		- timestamp within window (e.g., 5 minutes).
		- nonce uniqueness per key within window (store in DB table or short-lived cache later).
	- Acceptance:
		- Replayed requests are rejected.

- [x] Idempotency
	- Enforce unique `eventId` per game.
	- If event already exists, return `200` (idempotent success).
	- Acceptance:
		- Retried events do not duplicate records.

- [x] Persistence
	- `SdkEvent` table with indexes:
		- `(gameId, eventId)` unique
		- `(gameId, createdAt)` for queries
	- Acceptance:
		- Insert performance stays stable under load.

- [x] Read models
	- Leaderboard strategy:
		- Start with query-based computation for MVP.
		- Add snapshots later (daily/weekly) if needed.
	- Use-cases:
		- `GetGameLeaderboard`
		- `GetPlayerHistory`
	- Acceptance:
		- Leaderboard endpoint returns deterministic ranking.

- [ ] Background processing (optional)
	- Postgres queue table: `AggregationJob`.
	- Worker process:
		- picks jobs, aggregates to tables (e.g., `LeaderboardEntry`).
	- Acceptance:
		- Aggregations are retryable and idempotent.

### Phase 10 — Production Readiness
**Goal:** ship safely with confidence.

- [ ] Observability
	- Add metrics (request duration, error rates).
	- Add tracing hooks (optional).
	- Acceptance:
		- It’s possible to debug a failed payment/webhook via logs.

- [ ] Security hardening
	- Tighten CORS.
	- Set body limits.
	- Secrets rotation approach for SDK keys.
	- Acceptance:
		- Webhook endpoints verify signatures and reject invalid calls.

- [ ] Migration strategy
	- Prisma migrations committed.
	- CI runs `prisma migrate status` (or equivalent).
	- Acceptance:
		- Schema changes are reproducible.

- [ ] Documentation
	- Write “Local Dev” section (Docker + env vars).
	- [x] OpenAPI documentation (Swagger UI at `/docs`, spec at `/docs/json`).
	- Acceptance:
		- A new dev can boot the project in < 10 minutes.

## 10) Definition of Done (Per Feature)
- Use-case implemented with interfaces/ports.
- HTTP endpoint validated by Zod and covered by contract tests (where applicable).
- Prisma layer tested minimally (integration) for critical flows (payments/webhooks).
- Errors standardized.
- Idempotency + webhook signature verification for payment and SDK ingestion.

