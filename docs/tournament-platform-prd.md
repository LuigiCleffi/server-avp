# avp Auth API PRD (Backend)

## Overview

This service is currently scoped to authentication and account identity.
The API provides account registration, login, current-account lookup, and password reset flows.

The access token is a JWT and includes the `account_id` claim, which identifies the authenticated account.

## Current Scope

- Account registration
- Account login
- Get current authenticated account
- Request password reset
- Reset password with token
- Health check endpoint
- Swagger/OpenAPI documentation

## Out of Scope (Current Phase)

- Tournament CRUD and lifecycle
- Wallet and payment flows
- Game registry and SDK ingestion
- Admin moderation endpoints
- Webhook processing

## API Surface

### Health

- `GET /health`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /me`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

## Authentication Contract

- Access token type: JWT Bearer token
- Authorization header format: `Authorization: Bearer <token>`
- Required claim in token payload: `account_id`
- Additional claim in token payload: `role`

## OpenAPI / Swagger

- Swagger UI: `/docs`
- OpenAPI JSON: `/docs/json`

## Frontend Integration Notes

- Store `accessToken` after login according to client strategy (for example, local storage or secure cookies).
- Send `Authorization: Bearer <accessToken>` on protected requests.
- Use `/me` to resolve the logged-in account profile for session bootstrap.

## Future Direction

The account-oriented contract (`account_id`) is intentionally generic so the platform can later support distinct account capabilities (for example, tournament managers vs players) without changing the auth primitive.
