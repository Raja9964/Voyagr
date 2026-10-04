# Voyagr

Search and book flights, trains and buses across India, with seat inventory that can't be oversold.

[![CI](https://github.com/Raja9964/Voyagr/actions/workflows/ci.yml/badge.svg)](https://github.com/Raja9964/Voyagr/actions/workflows/ci.yml)

| Search | Results |
| --- | --- |
| ![Home page with trip search](docs/screenshots/home.png) | ![Search results with filters](docs/screenshots/search-results.png) |
| **Booking** | **My trips** |
| ![Booking flow](docs/screenshots/booking.png) | ![My trips with cancel](docs/screenshots/my-trips.png) |

## Features

- Trip search by origin, destination, date and number of travellers, with filters for travel mode and maximum fare and sorting by departure, fare or journey time
- Booking flow that looks a traveller up by email and creates a profile inline if they are new
- Seat booking inside a MySQL transaction with `SELECT ... FOR UPDATE`, so concurrent requests can't oversell a trip
- Fare captured at booking time (`total_price`) so later price changes don't rewrite past bookings
- "My trips" page that lists a traveller's reservations and cancels them before departure, returning the seats to inventory
- Simple traveller registration
- Request validation with zod and consistent JSON errors (400 / 404 / 409)
- Seed data generated with a recursive CTE: a fictional daily timetable expanded over the next 14 days

Scope note: there is no authentication. A traveller is identified by email only, which keeps the demo simple but means anyone who knows a reservation id can cancel it.

## Tech stack

| Layer | Tools |
| --- | --- |
| Client | React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, React Router |
| Server | Node.js 24 (native TypeScript), Express 5, mysql2 (promise pool), zod, helmet, cors |
| Database | MySQL 8 |
| Testing | Vitest, Supertest, real-MySQL integration tests |
| CI | GitHub Actions with a MySQL 8 service container |

## Architecture

```mermaid
flowchart LR
  subgraph Client["client (React + Vite)"]
    Pages --> Query["TanStack Query"] --> ApiClient["lib/api.ts"]
  end
  ApiClient -- "JSON over /api" --> Routes
  subgraph Server["server (Express 5)"]
    Routes["routes + zod schemas"] --> Services["services<br/>(booking rules)"]
    Services --> Store["Store interface"]
    Store --> MySqlStore["MySQL repositories"]
    Store -. tests .-> MemoryStore["in-memory repositories"]
    Routes -.-> ErrorHandler["central error handler"]
  end
  MySqlStore -- "mysql2 pool" --> DB[(MySQL 8)]
```

Routes parse and validate input, services hold the business rules (seat checks, departure checks, cancellation), and repositories own SQL. Services depend on a `Store` interface with a `transaction()` method, so the same booking code runs against MySQL in production and an in-memory store in route tests.

## Data model

```mermaid
erDiagram
  USERS ||--o{ RESERVATIONS : makes
  TRIPS ||--o{ RESERVATIONS : "is booked on"

  USERS {
    int id PK
    varchar name
    varchar email UK
    varchar phone
    datetime created_at
  }
  TRIPS {
    int id PK
    enum mode "flight | train | bus"
    varchar operator
    varchar code
    varchar origin
    varchar destination
    datetime departure_time
    datetime arrival_time
    decimal price
    smallint seat_capacity
    smallint seats_available
  }
  RESERVATIONS {
    int id PK
    int user_id FK
    int trip_id FK
    tinyint seats
    decimal total_price
    enum status "confirmed | cancelled"
    datetime created_at
    datetime cancelled_at
  }
```

All `DATETIME` columns hold UTC. The schema backs up the application rules with constraints: `seats_available` is unsigned and must not exceed `seat_capacity`, arrival must be after departure, and `cancelled_at` is set exactly when a reservation is cancelled.

## Project structure

```
.
├── client/                 React app
│   └── src/
│       ├── components/     layout, search form, trip card, UI states
│       ├── lib/            API client, types, formatting
│       └── pages/          home, results, booking, confirmation, my trips, register
├── server/
│   ├── db/                 schema.sql, seed.sql
│   ├── scripts/db-init.ts  creates the database and loads schema + seed
│   ├── src/
│   │   ├── domain/         shared types
│   │   ├── http/           routes, zod schemas, error handler
│   │   ├── services/       users, trips, reservations
│   │   ├── repositories/   Store interface, mysql/ and memory/ implementations
│   │   ├── app.ts          builds the Express app from a Store
│   │   └── index.ts        wires config, pool and server
│   └── test/               API tests (in-memory) and MySQL integration tests
└── .github/workflows/ci.yml
```

## Getting started

Requirements: Node.js 22.18+ (24 recommended, the server runs TypeScript natively) and MySQL 8.0.16+.

**1. Create a database user** (in the MySQL shell, as an admin):

```sql
CREATE DATABASE voyagr CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'voyagr'@'localhost' IDENTIFIED BY 'choose-a-password';
GRANT ALL PRIVILEGES ON voyagr.* TO 'voyagr'@'localhost';
```

**2. Start the API** on http://localhost:8102:

```bash
cd server
cp .env.example .env        # then set DB_PASSWORD
npm install
npm run db:init             # drops and recreates tables, loads demo data
npm run dev
```

**3. Start the client** on http://localhost:5102:

```bash
cd client
npm install
npm run dev
```

The Vite dev server proxies `/api` to port 8102, so no CORS setup is needed locally. Demo travellers: `asha@example.com` and `vikram@example.com`.

## Configuration

Server (`server/.env`):

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `8102` | API port |
| `CLIENT_ORIGIN` | `http://localhost:5102` | Comma-separated origins allowed by CORS |
| `DB_HOST` | `127.0.0.1` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `voyagr` | MySQL user |
| `DB_PASSWORD` | empty | MySQL password |
| `DB_NAME` | `voyagr` | Database name |
| `DB_POOL_SIZE` | `10` | Connection pool size |
| `TEST_DB_NAME` | `voyagr_test` | Database used (and wiped) by integration tests |

Client (`client/.env`):

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_URL` | empty | API origin for production builds. Leave empty in development to use the Vite proxy. |

## API reference

All endpoints are under `/api`. Errors use the shape `{ "error": { "code", "message", "details?" } }`.

| Method | Path | Description | Responses |
| --- | --- | --- | --- |
| GET | `/health` | Liveness and database check | 200, 503 |
| GET | `/cities` | Distinct origin and destination cities | 200 |
| GET | `/trips` | Search upcoming trips. Query: `from`, `to`, `date` (YYYY-MM-DD, IST), `mode` (`flight,train,bus`), `maxPrice`, `seats`, `sort` (`departure`, `price`, `duration`), `limit` | 200, 400 |
| GET | `/trips/:id` | Trip details | 200, 404 |
| POST | `/users` | Register `{ name, email, phone? }` and return the new user with its id | 201, 400, 409 |
| GET | `/users/lookup?email=` | Find a traveller by email | 200, 404 |
| GET | `/users/:id/reservations` | A traveller's reservations with trip details | 200, 404 |
| POST | `/reservations` | Book `{ userId, tripId, seats }` (1 to 9 seats) | 201, 400, 404, 409 |
| GET | `/reservations/:id` | Reservation with trip details | 200, 404 |
| POST | `/reservations/:id/cancel` | Cancel before departure and release the seats | 200, 404, 409 |

### How booking stays consistent

```
BEGIN
  SELECT ... FROM trips WHERE id = ? FOR UPDATE   -- other bookings for this trip wait here
  check departure time and seats_available
  UPDATE trips SET seats_available = seats_available - ?
  INSERT INTO reservations (..., total_price)
COMMIT                                             -- or ROLLBACK on any error
```

Cancellation locks the reservation, then the trip, marks it cancelled and adds the seats back in the same transaction.

## Testing

```bash
cd server
npm test                    # API tests against the in-memory store
npm run typecheck
npm run lint
```

To include the MySQL integration tests, point the tests at a server. They create and wipe their own database (`TEST_DB_NAME`, default `voyagr_test`):

```bash
DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=root DB_PASSWORD=secret npm test
```

The integration suite checks SQL filtering, the unique email constraint, rollback on failure, schema constraints, and fires 12 concurrent booking requests at a trip with 5 seats to confirm exactly 5 succeed.

```bash
cd client
npm test
npm run lint
npm run build
```

CI runs all of the above on every push and pull request, with MySQL 8 as a service container.

## License

[MIT](LICENSE)
