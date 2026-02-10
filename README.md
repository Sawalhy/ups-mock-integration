# Carrier Integration Service (UPS Rating)

## How to Run

### Local
1. Install dependencies:
   - `npm install`
2. Configure environment:
   - Copy `.env.example` to `.env` and set values.
3. Build and start:
   - `npm run build`
   - `npm start`

The service listens on `PORT` (default `3000`).

### Docker
- Start backend:
  - `docker compose up --build backend`
- Run integration tests:
  - `docker compose up --build integration-tests`

## How to Run Tests

- Integration tests run sequentially and print scenario messages:
  - `npm run test:integration`
- Integration fixtures are based on the UPS Rating OpenAPI spec (`Rating.yaml`) and cover
  only the fields the service generates/consumes to keep validation minimal and focused.

## API

- `POST /rates/quote`
  - Optional `carrierId`: if provided, returns only that carrier’s quotes; if omitted, returns a flat list of quotes for all enabled carriers.
  - Example request body:
    ```json
    {
      "carrierId": "ups",
      "origin": { "postalCode": "94103", "countryCode": "US" },
      "destination": { "postalCode": "10001", "countryCode": "US" },
      "packages": [{ "weight": { "value": 2, "unit": "LB" } }]
    }
    ```

## Design Decisions & Tradeoffs

- **NestJS module layout**: keeps controllers/services/providers aligned with Nest conventions.
- **Hexagonal boundaries**: carrier-agnostic interfaces + UPS adapters allow new carriers without rewriting core logic.
- **Zod validation**: runtime validation for requests and upstream responses, generated from the
  UPS Rating OpenAPI spec (`Rating.yaml`) for the fields we use; faster to evolve than class-validator for this exercise.
- **In-memory auth cache**: simple and sufficient for the take-home; uses `expires_in` + safety buffer.
- **Error handling**: structured errors for auth, validation, rate limit, malformed response (including JSON parse errors), timeouts, and upstream failures; 401/403 triggers a one-time token refresh retry.

### Error Mapping

| UPS HTTP Status | CarrierError Code | Message |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | UPS rejected request |
| 401 | `AUTH_ERROR` | UPS auth rejected |
| 403 | `AUTH_ERROR` | UPS blocked merchant |
| 429 | `RATE_LIMIT` | UPS rate limit exceeded |
| 5xx | `UPSTREAM_ERROR` | UPS service error |
| Invalid JSON | `MALFORMED_RESPONSE` | HTTP response malformed JSON |
| Invalid schema | `MALFORMED_RESPONSE` | UPS rate response invalid |

Tradeoffs:
- **No persistence**: token cache is in-memory only; a distributed cache would be required in production.
- **Single endpoint**: only rate shopping is implemented, but the structure is ready for labels/tracking.

## With More Time

- Separate carrier-specific error mapping into dedicated error mapper classes (e.g., `UpsErrorMapper`) so adapters only delegate errors rather than encode carrier-specific status logic.

## Extending the Code

- Add a new carrier:
  1. Implement `CarrierRateProvider`.
  2. Add a new module under `src/carriers/<carrier>/`.
  3. Register it in `CarrierRegistry`.
  4. Add fixtures and integration tests.
- Add a new UPS operation:
  1. Create a new adapter class under `src/carriers/ups/`.
  2. Add mappers + response schemas.
  3. Wire it in a new service or endpoint.

## Environment Variables

See `.env.example` for required values.
