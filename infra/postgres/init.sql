CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS holds (
  hold_id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  qty INT NOT NULL CHECK (qty > 0),
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','CONFIRMED','CANCELLED','EXPIRED')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  idempotency_key TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_holds_status_expires
ON holds(status, expires_at);

CREATE TABLE IF NOT EXISTS orders (
  order_id UUID PRIMARY KEY,
  hold_id TEXT UNIQUE NOT NULL REFERENCES holds(hold_id),
  user_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  qty INT NOT NULL CHECK (qty > 0),
  status TEXT NOT NULL CHECK (status IN ('PAID','FAILED')),
  payment_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS processed_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
