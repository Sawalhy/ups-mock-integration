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
- **Zod validation**: runtime validation for requests and upstream responses; faster to evolve than class-validator for this exercise.
- **In-memory auth cache**: simple and sufficient for the take-home; uses `expires_in` + safety buffer.
- **HTTP_MODE toggle**: `stub|live` chooses stubbed or real HTTP without code changes.

Tradeoffs:
- **No persistence**: token cache is in-memory only; a distributed cache would be required in production.
- **Single endpoint**: only rate shopping is implemented, but the structure is ready for labels/tracking.

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
