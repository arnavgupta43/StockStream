High Conurency Inventory Management System Using Redis and PostgreSQL
![Overview](https://res.cloudinary.com/dq9kpvvug/image/upload/v1770382370/Screenshot_2026-02-05_154914_w2vtr3.png)
A high-performance event-driven inventory reservation system designed to prevent overselling during high-concurrency e-commerce events (flash sales, limited drops, ticket booking, etc.).

The system uses Redis (hot-path concurrency control) and PostgreSQL (durable system of record) connected through Redis Streams for asynchronous persistence.

🚀 Project Overview

Traditional inventory systems often fail under load because:

Database row locks create contention.

High concurrent requests slow down checkout.

Overselling happens due to race conditions.

StockStream solves this by:

✅ Moving reservation logic to Redis (atomic operations)
✅ Using Streams + Worker for async persistence
✅ Ensuring no oversell while keeping API latency low

🧠 Architecture & System Design
🏗 High Level Flow
Client
↓
API Service (Node.js + Express)
↓
Redis
├── stock counters
├── hold objects (TTL)
└── Stream (inventory.events)
↓
Worker Service
↓
PostgreSQL

⚡ Core Components
1️⃣ API Service

Handles user actions:

Reserve inventory

Confirm purchase

Cancel reservation

Responsibilities:

Atomic stock decrement in Redis

Hold creation with TTL

Event publishing to Redis Streams

Fast response (DB not on critical path)

2️⃣ Redis (Hot Path Engine)

Redis stores:

Key Purpose
stock:{sku} Available inventory
hold:{hold_id} Temporary reservation
idem:{key} Idempotency mapping
inventory.events Event stream

Why Redis?

Atomic operations

Extremely low latency

Prevents DB lock contention

3️⃣ Worker Service

Consumes Redis Stream events and writes durable state:

Events processed:

HOLD_CREATED

HOLD_CONFIRMED

HOLD_CANCELLED

Responsibilities:

Insert/update holds table

Create orders

Deduplicate events

Maintain eventual consistency

4️⃣ PostgreSQL (Durable Store)

Tables:

holds -> reservation lifecycle
orders -> completed purchases
processed_events -> idempotent stream processing

Postgres acts as the source of truth.

🔄 Consistency Model
Strong Consistency (Inventory Safety)

Reservation logic uses Redis atomic operations to guarantee:

Stock never goes below zero.

This ensures no overselling even under concurrency.

Eventual Consistency (Persistence)

Redis → Worker → Postgres is asynchronous.

Meaning:

API responds immediately.

DB updates happen shortly after.

This reduces latency and absorbs traffic spikes.

📡 Event Driven Design

Example event in Redis Stream:

{
"event_id": "uuid",
"type": "HOLD_CREATED",
"payload": {
"hold_id": "H-12345",
"sku": "iphone_15_pro_256",
"qty": 1
}
}

Worker uses:

XREADGROUP
XACK
Processed Events Table

to ensure at-least-once delivery with idempotent writes.

🧰 Tech Stack

Node.js (ESM)

Express.js

Redis 7 (Streams)

PostgreSQL 16

Docker Compose

pg (node-postgres)

📁 Project Structure
services/
api/
worker/
shared/
infra/

api/ → HTTP layer + Redis hot path

worker/ → Stream consumer

shared/ → event contracts

infra/ → docker-compose & DB schema

⚙️ Setup & Run Instructions
1️⃣ Requirements

Docker Desktop

Node.js (for local dev only)

PowerShell / Bash

2️⃣ Start the system

From project root:

docker compose -f infra/docker-compose.yml up --build

Docker will automatically:

Pull Redis & Postgres images

Build API and Worker images

Start all services

3️⃣ Verify containers
docker ps

Expected:

infra-api-1
infra-worker-1
infra-redis-1
infra-postgres-1

🧪 Testing the System
🔹 Step 1 — Seed Stock
docker exec -it infra-redis-1 redis-cli

SET stock:iphone_15_pro_256 3

🔹 Step 2 — Create Reservation
curl -X POST http://localhost:8080/holds/reserve \
-H "Content-Type: application/json" \
-d '{
"sku":"iphone_15_pro_256",
"qty":1,
"user_id":"arnav",
"idempotency_key":"idem-1"
}'

Expected Response:

{
"hold_id":"H-xxxx"
}

🔹 Step 3 — Inspect Redis State
GET stock:iphone_15_pro_256
KEYS hold:\*
XRANGE inventory.events - + COUNT 5

🔹 Step 4 — Verify Postgres Persistence
docker exec -it infra-postgres-1 psql -U app -d inventory

SELECT _ FROM holds;
SELECT _ FROM processed_events;

🔹 Step 5 — Confirm Hold
curl -X POST http://localhost:8080/holds/confirm \
-H "Content-Type: application/json" \
-d '{"hold_id":"H-xxxx","payment_ref":"pay-1"}'

Verify:

SELECT \* FROM orders;

🔹 Step 6 — Test No-Oversell

Reserve until stock = 0.

Next reserve request returns:

409 SOLD OUT

🔹 Step 7 — Test Idempotency

Repeat same idempotency_key.

System returns same hold_id without decrementing stock again.

🔍 Debugging Tips
Check Stream Messages
XRANGE inventory.events - + COUNT 10

Check Consumer Group
XINFO GROUPS inventory.events
XPENDING inventory.events inventory.cg

Worker Logs
docker logs -f infra-worker-1

🛠 Design Decisions
Why Redis Streams instead of RabbitMQ?

Lightweight setup

No extra infrastructure

Built-in persistence + consumer groups

Guarantee:

At-least-once delivery

with idempotent DB writes.

Why Redis for Inventory?

Database locks under heavy load cause:

slow queries

timeouts

overselling

Redis provides atomic decrement with minimal latency.

Why Async Worker?

Decouples API from DB load:

API stays fast even if DB slows.

📈 Future Improvements

Lua scripts for atomic reserve

Expiry sweeper for automatic stock return

Dead-letter stream for failed events

Redis persistence tuning (AOF)

Horizontal worker scaling

Metrics & tracing

👨‍💻 Author

Built as a distributed systems learning project demonstrating:

Event-driven architecture

Stream processing

Idempotency patterns

High-concurrency inventory design
