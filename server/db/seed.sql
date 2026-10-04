-- Demo data: a daily timetable expanded over the next 14 days, plus two travellers.
-- Operators are fictional. Times in the timetable are IST and stored as UTC.

SET @day0 = TIMESTAMP(DATE(UTC_TIMESTAMP() + INTERVAL 330 MINUTE)) - INTERVAL 330 MINUTE;

CREATE TEMPORARY TABLE seed_timetable (
  mode          ENUM ('flight', 'train', 'bus') NOT NULL,
  operator      VARCHAR(80)       NOT NULL,
  code          VARCHAR(20)       NOT NULL,
  origin        VARCHAR(80)       NOT NULL,
  destination   VARCHAR(80)       NOT NULL,
  departs_at    TIME              NOT NULL,
  duration_min  SMALLINT UNSIGNED NOT NULL,
  base_price    DECIMAL(10, 2)    NOT NULL,
  capacity      SMALLINT UNSIGNED NOT NULL
);

INSERT INTO seed_timetable VALUES
  ('flight', 'Skyline Air',           'SK 201', 'Bengaluru', 'Mumbai',     '06:10',  105, 4899, 180),
  ('flight', 'Monsoon Air',           'MN 412', 'Bengaluru', 'Mumbai',     '18:45',  110, 5299, 186),
  ('flight', 'Skyline Air',           'SK 202', 'Mumbai',    'Bengaluru',  '09:30',  105, 4999, 180),
  ('flight', 'Skyline Air',           'SK 305', 'Bengaluru', 'New Delhi',  '07:00',  165, 6899, 180),
  ('flight', 'Monsoon Air',           'MN 518', 'New Delhi', 'Bengaluru',  '15:20',  170, 7199, 186),
  ('flight', 'Monsoon Air',           'MN 140', 'Bengaluru', 'Goa',        '11:15',   75, 3599, 150),
  ('flight', 'Skyline Air',           'SK 118', 'Bengaluru', 'Kochi',      '08:40',   70, 3299, 150),
  ('flight', 'Skyline Air',           'SK 421', 'Bengaluru', 'Hyderabad',  '13:05',   75, 3199, 180),
  ('flight', 'Monsoon Air',           'MN 650', 'Bengaluru', 'Pune',       '16:30',   95, 3899, 150),
  ('flight', 'Monsoon Air',           'MN 760', 'Mumbai',    'Goa',        '12:40',   70, 3299, 150),
  ('train',  'Garden City Express',   '16021',  'Bengaluru', 'Chennai',    '06:00',  330,  795,  72),
  ('train',  'Garden City Express',   '16022',  'Chennai',   'Bengaluru',  '14:30',  330,  795,  72),
  ('train',  'Western Ghats Express', '16523',  'Bengaluru', 'Mysuru',     '07:15',  150,  265,  90),
  ('train',  'Western Ghats Express', '16524',  'Mysuru',    'Bengaluru',  '17:40',  150,  265,  90),
  ('train',  'Deccan Link',           '17603',  'Bengaluru', 'Hyderabad',  '20:10',  690, 1240,  72),
  ('train',  'Konkan Link',           '16595',  'Bengaluru', 'Goa',        '21:00',  780, 1185,  64),
  ('train',  'Arabian Link',          '11301',  'Bengaluru', 'Mumbai',     '20:30', 1440, 1650,  72),
  ('train',  'Capital Link',          '22691',  'Bengaluru', 'New Delhi',  '20:00', 2040, 3450,  64),
  ('bus',    'Greenline Travels',     'GL 7',   'Bengaluru', 'Mysuru',     '08:00',  195,  449,  40),
  ('bus',    'Greenline Travels',     'GL 8',   'Mysuru',    'Bengaluru',  '15:30',  195,  449,  40),
  ('bus',    'Greenline Travels',     'GL 9',   'Bengaluru', 'Chennai',    '22:30',  390,  899,  36),
  ('bus',    'Greenline Travels',     'GL 21',  'Mumbai',    'Pune',       '07:30',  210,  549,  40),
  ('bus',    'Nightrider Sleeper',    'NR 21',  'Bengaluru', 'Goa',        '19:30',  720, 1499,  30),
  ('bus',    'Nightrider Sleeper',    'NR 33',  'Bengaluru', 'Hyderabad',  '21:45',  600, 1299,  30),
  ('bus',    'Coastal Coaches',       'CC 12',  'Bengaluru', 'Kochi',      '20:15',  660, 1199,  36),
  ('bus',    'Coastal Coaches',       'CC 14',  'Bengaluru', 'Pune',       '18:00',  900, 1599,  36);

-- Fares move between 90% and 114% of base and occupancy varies by day,
-- derived from a hash so every run produces the same timetable.
INSERT INTO trips (mode, operator, code, origin, destination, departure_time, arrival_time,
                   price, seat_capacity, seats_available)
WITH RECURSIVE days (n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 13
)
SELECT s.mode,
       s.operator,
       s.code,
       s.origin,
       s.destination,
       @day0 + INTERVAL d.n DAY + INTERVAL TIME_TO_SEC(s.departs_at) SECOND,
       @day0 + INTERVAL d.n DAY + INTERVAL TIME_TO_SEC(s.departs_at) SECOND
             + INTERVAL s.duration_min MINUTE,
       ROUND(s.base_price * (90 + CRC32(CONCAT(s.code, ':fare:', d.n)) % 25) / 100),
       s.capacity,
       s.capacity - FLOOR(s.capacity * (CRC32(CONCAT(s.code, ':load:', d.n)) % 97) / 100)
  FROM seed_timetable s
 CROSS JOIN days d;

DROP TEMPORARY TABLE seed_timetable;

INSERT INTO users (name, email, phone) VALUES
  ('Asha Rao',      'asha@example.com',   '+91 98450 12345'),
  ('Vikram Shetty', 'vikram@example.com', NULL);

INSERT INTO reservations (user_id, trip_id, seats, total_price, status, cancelled_at)
SELECT u.id,
       t.id,
       b.seats,
       t.price * b.seats,
       b.status,
       IF(b.status = 'cancelled', UTC_TIMESTAMP(), NULL)
  FROM (
         SELECT 'asha@example.com' AS email, 'MN 140' AS code, 3 AS day_offset, 2 AS seats, 'confirmed' AS status
         UNION ALL SELECT 'asha@example.com',   '16021', 6, 1, 'confirmed'
         UNION ALL SELECT 'asha@example.com',   'CC 12', 9, 2, 'cancelled'
         UNION ALL SELECT 'vikram@example.com', 'SK 201', 2, 1, 'confirmed'
       ) b
  JOIN users u ON u.email = b.email
  JOIN trips t ON t.code = b.code
              AND t.departure_time >= @day0 + INTERVAL b.day_offset DAY
              AND t.departure_time < @day0 + INTERVAL (b.day_offset + 1) DAY;

UPDATE trips t
  JOIN (
         SELECT trip_id, SUM(seats) AS seats
           FROM reservations
          WHERE status = 'confirmed'
          GROUP BY trip_id
       ) booked ON booked.trip_id = t.id
   SET t.seats_available = t.seats_available - booked.seats;
