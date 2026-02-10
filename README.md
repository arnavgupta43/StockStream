High Conurency Inventory Management System Using Redis and PostgreSQL
![Overview](https://res.cloudinary.com/dq9kpvvug/image/upload/v1770382370/Screenshot_2026-02-05_154914_w2vtr3.png)
A high-performance event-driven inventory reservation system designed to prevent overselling during high-concurrency e-commerce events (flash sales, limited drops, ticket booking, etc.).

The system uses **Redis** (hot-path concurrency control) and **PostgreSQL** (durable system of record) connected through **Redis Streams** for asynchronous persistence.

---

## Project Overview

Traditional inventory systems often fail under load because:

- **Database row locks** create contention.
- **High concurrent requests** slow down checkout.
- **Overselling** happens due to race conditions.

### StockStream solves this by:

- **Moving reservation logic to Redis** (atomic operations)
- **Using Streams + Worker** for async persistence
- **Ensuring no oversell** while keeping API latency low

## Architecture & System Design

### 🏗 High Level Flow

````mermaid
graph TD
    A[Client] --> B[API Service: Node.js + Express]
    B --> C[Redis]

    subgraph Redis_Components [Redis Storage]
    C --> C1[Stock Counters]
    C --> C2[Hold Objects: TTL]
    C --> C3[Stream: inventory.events]
    end

    C3 --> D[Worker Service]
    D --> E[(PostgreSQL)]

## ⚡ Core Components

### 1️⃣ API Service
Handles user actions such as **Reserve inventory**, **Confirm purchase**, and **Cancel reservation**.

* **Atomic stock decrement:** Managed directly in Redis to prevent race conditions.
* **Hold creation:** Implements TTL (Time-To-Live) for temporary locks.
* **Event publishing:** Pushes data to Redis Streams.
* **Fast response:** Database operations are removed from the critical path to minimize latency.

---

### 2️⃣ Redis (Hot Path Engine)
Redis serves as the high-performance layer for real-time state management.

| Key | Purpose |
| :--- | :--- |
| `stock:{sku}` | Tracks available inventory levels |
| `hold:{hold_id}` | Manages temporary reservations with TTL |
| `idem:{key}` | Ensures request idempotency |
| `inventory.events` | The event stream for the Worker Service |

**Why Redis?** It provides atomic operations and sub-millisecond latency, effectively preventing PostgreSQL lock contention during high-traffic bursts.

---

### 3️⃣ Worker Service
An asynchronous consumer that processes the Redis Stream to maintain the system of record.

* **Events Processed:** `HOLD_CREATED`, `HOLD_CONFIRMED`, `HOLD_CANCELLED`.
* **Responsibilities:** * Updating the `holds` table in the database.
    * Generating permanent `orders`.
    * Deduplicating events to ensure exactly-once processing.
    * Maintaining **eventual consistency** between Redis and PostgreSQL.

---

### 4️⃣ PostgreSQL (Durable Store)
The final source of truth for all transactional data.

* **`holds`**: Tracks the lifecycle of every reservation.
* **`orders`**: Stores finalized purchase records.
* **`processed_events`**: Used for idempotent stream processing to ensure data integrity.

## 🔄 Consistency Model

### Strong Consistency (Inventory Safety)
The reservation logic utilizes **Redis atomic operations** to guarantee that **stock never goes below zero**. This ensures zero overselling, even under extreme high-concurrency scenarios.

### Eventual Consistency (Persistence)
The data flow from **Redis → Worker → Postgres** is asynchronous.
* **Immediate Response:** The API responds to the user as soon as the Redis operation is successful.
* **Lagged Persistence:** Database updates happen shortly after via the worker.
* **Benefit:** This architecture significantly reduces API latency and acts as a buffer to absorb massive traffic spikes.

---

## 📡 Event Driven Design

The system communicates state changes through structured events. Below is an example of a payload within the **Redis Stream**:

```json
{
  "event_id": "uuid",
  "type": "HOLD_CREATED",
  "payload": {
    "hold_id": "H-12345",
    "sku": "iphone_15_pro_256",
    "qty": 1
  }
}

### 🔄 Reliability & Delivery
The Worker ensures **at-least-once delivery** with **idempotent writes** by leveraging:

* **`XREADGROUP`**: For persistent consumer group management and load balancing.
* **`XACK`**: To acknowledge successful processing and remove items from the Pending Entries List (PEL).
* **Processed Events Table**: A deduplication layer in PostgreSQL to prevent duplicate processing of the same `event_id`.

---

## 🧰 Tech Stack

| Component | Technology |
| :--- | :--- |
| **Runtime** | Node.js (ESM) |
| **Web Framework** | Express.js |
| **In-Memory Store** | Redis 7 (Streams) |
| **Database** | PostgreSQL 16 |
| **Containerization** | Docker Compose |
| **Database Driver** | `pg` (node-postgres) |

---

## 📁 Project Structure

```text
services/
├── api/          # HTTP layer + Redis hot path logic
├── worker/       # Stream consumer & DB persistence
├── shared/       # Event contracts & shared types
└── infra/        # Docker Compose & SQL DB schema

## ⚙️ Setup & Run Instructions

### 1️⃣ Requirements
* **Docker Desktop**
* **Node.js** (for local development only)
* **PowerShell / Bash**

---

### 2️⃣ Start the System
Run the following command from the project root to orchestrate the environment:

```bash
docker compose -f infra/docker-compose.yml up --build
When you run the build command, Docker will automatically perform the following steps:

* **Pull** the official Redis and Postgres images from Docker Hub.
* **Build** the custom local images for the API and Worker services.
* **Start** all services and link them through the internal network.

---

### 3️⃣ Verify Containers
Once the startup process completes, check the status of your containers to ensure everything is running correctly:

```bash
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
````
