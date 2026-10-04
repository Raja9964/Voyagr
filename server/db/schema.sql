-- Voyagr schema for MySQL 8.0.16+ (CHECK constraints are enforced from that version).
-- All DATETIME columns hold UTC. Running this file drops existing data.

DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(254) NOT NULL,
  phone       VARCHAR(20)  NULL,
  created_at  DATETIME     NOT NULL DEFAULT (UTC_TIMESTAMP()),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE trips (
  id               INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  mode             ENUM ('flight', 'train', 'bus') NOT NULL,
  operator         VARCHAR(80)       NOT NULL,
  code             VARCHAR(20)       NOT NULL,
  origin           VARCHAR(80)       NOT NULL,
  destination      VARCHAR(80)       NOT NULL,
  departure_time   DATETIME          NOT NULL,
  arrival_time     DATETIME          NOT NULL,
  price            DECIMAL(10, 2)    NOT NULL,
  seat_capacity    SMALLINT UNSIGNED NOT NULL,
  seats_available  SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_trips_service (code, departure_time),
  KEY idx_trips_route_departure (origin, destination, departure_time),
  KEY idx_trips_departure (departure_time),
  CONSTRAINT chk_trips_route CHECK (origin <> destination),
  CONSTRAINT chk_trips_schedule CHECK (arrival_time > departure_time),
  CONSTRAINT chk_trips_price CHECK (price >= 0),
  -- Last line of defence against overbooking: the column is UNSIGNED, so it can't go below zero.
  CONSTRAINT chk_trips_seats CHECK (seats_available <= seat_capacity)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE reservations (
  id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED     NOT NULL,
  trip_id       INT UNSIGNED     NOT NULL,
  seats         TINYINT UNSIGNED NOT NULL,
  -- Fare is captured at booking time so later price changes don't rewrite history.
  total_price   DECIMAL(10, 2)   NOT NULL,
  status        ENUM ('confirmed', 'cancelled') NOT NULL DEFAULT 'confirmed',
  created_at    DATETIME         NOT NULL DEFAULT (UTC_TIMESTAMP()),
  cancelled_at  DATETIME         NULL,
  PRIMARY KEY (id),
  KEY idx_reservations_user (user_id, created_at),
  KEY idx_reservations_trip (trip_id),
  CONSTRAINT fk_reservations_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_reservations_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
  CONSTRAINT chk_reservations_seats CHECK (seats BETWEEN 1 AND 9),
  CONSTRAINT chk_reservations_cancelled CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
