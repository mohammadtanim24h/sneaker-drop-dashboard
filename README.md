# 🛍️ Live Sneaker Drop Dashboard

A real-time high-traffic inventory system for limited sneaker drops. Users can reserve items, complete purchases, and see live stock updates across all clients instantly.

---

## 🚀 Tech Stack

- **Frontend:** React + TypeScript + React Query
- **Backend:** Node.js + Express (ESM)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Real-time:** Socket.IO

---

## 📦 Project Structure

```
root/
│
├── backend/
│   ├── src/
│   ├── prisma/
│   └── package.json
│
├── frontend/
│   ├── src/
│   └── package.json
│
└── README.md
```

---

# ⚙️ How to Run the App

## 1. Clone & Install

```bash
git clone <your-repo>
cd <repo>

# Backend
cd server
pnpm install

# Frontend
cd ../client
pnpm install
```

---

## 2. Setup Database (PostgreSQL)

Create a PostgreSQL database manually or via a provider.

### Add `.env` in server(follow the .env.example file):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME"
```

---

## 3. Prisma Setup (Schema + Migration)

From **server folder**:

```bash
pnpm dlx prisma db push
pnpm dlx prisma generate
```

This will:

- Create tables
- Apply schema
- Generate Prisma client

---

## 4. Seed Database

```bash
pnpm dlx prisma db seed
```

This inserts:

- Users
- Sneaker drop
- Reservations
- Purchases (for activity feed)

---

## 5. Run Backend

```bash
pnpm dev
```

Server runs at:

```
http://localhost:3000
```

---

## 6. Run Frontend

### Add `.env` in client(follow the .env.example file):

```bash
cd ../client
pnpm dev
```

App runs at:

```
http://localhost:5173
```

---

# 📡 API Reference

## `POST /api/drops` - Create a New Drop

Creates a new sneaker drop with support for existing or new sneakers.

### Request Options

**Option 1: Create drop with existing sneaker**

```json
{
    "sneakerId": "sneaker_id_here",
    "stock": 100,
    "price": 250,
    "releaseAt": "2026-04-19 11:43:00+00"
}
```

**Option 2: Create drop with new sneaker (inline)**

```json
{
    "name": "Air Jordan 1 High",
    "brand": "Nike",
    "imageUrl": "https://example.com/image.jpg",
    "stock": 100,
    "price": 250,
    "releaseAt": "2026-04-19 11:43:00+00"
}
```

### Fields

| Field       | Type        | Required | Description                              |
| ----------- | ----------- | -------- | ---------------------------------------- |
| `sneakerId` | string      | No\*     | ID of existing sneaker                   |
| `name`      | string      | No\*     | Sneaker name (required if no sneakerId)  |
| `brand`     | string      | No\*     | Sneaker brand (required if no sneakerId) |
| `imageUrl`  | string      | No       | Sneaker image URL                        |
| `stock`     | number      | **Yes**  | Total stock quantity (must be > 0)       |
| `price`     | number      | **Yes**  | Retail price (must be > 0)               |
| `releaseAt` | string/Date | No       | Release time (defaults to now)           |

### Behavior

- **Automatic status assignment**:
    - `releaseAt > now` → status: `UPCOMING`
    - `releaseAt <= now` → status: `LIVE`
- **Validation**: Returns 400 if stock/price ≤ 0, or 404 if sneakerId not found
- **Response**: Returns created drop with sneaker details

### Example Response

```json
{
    "id": "drop_id",
    "sneakerId": "sneaker_id",
    "totalStock": 100,
    "availableStock": 100,
    "retailPrice": 250,
    "releaseAt": "2026-04-20T10:00:00.000Z",
    "status": "UPCOMING",
    "sneaker": {
        "id": "sneaker_id",
        "name": "Air Jordan 1 High",
        "brand": "Nike"
    }
}
```

---

# 🧠 Architecture Decisions

## 1. 60-Second Expiration Logic

### Approach Used:

A **database-driven expiration system + background worker**

### Implementation:

- Each reservation has:

    ```
    expiresAt: DateTime
    status: ACTIVE
    ```

- A background job runs every 5 seconds using **recursive setTimeout**:

    ```ts
    const run = async () => {
        try {
            // Process expired reservations
            await expireReservations();
        } catch (error) {
            console.error(error);
        } finally {
            setTimeout(run, 5000); // Schedule next run
        }
    };
    run(); // Start the job
    ```

- It:
    1. Finds expired reservations
    2. Marks them `EXPIRED`
    3. Restores stock
    4. Emits WebSocket update

### Why recursive setTimeout?

| Option             | Problem                  |
| ------------------ | ------------------------ |
| setTimeout per req | Lost on server restart   |
| In-memory tracking | Not scalable             |
| setInterval        | ⚠️ Race condition risk   |
| Recursive timeout  | ✅ Reliable + no overlap |

### Key benefits:

- **No race conditions**: Next run only starts after current completes
- **Self-healing**: Continues running even if an iteration fails
- **Survives restarts**: Database-driven state persists

## 2. Concurrency Handling (Prevent Overselling)

### Problem:

Multiple users try to reserve the **last item at the same time**

### Solution:

**Atomic database transaction using conditional update**

```ts
await tx.drop.updateMany({
    where: {
        id: dropId,
        availableStock: { gt: 0 },
    },
    data: {
        availableStock: { decrement: 1 },
        reservedStock: { increment: 1 },
    },
});
```

### Why this works:

- `availableStock > 0` is checked **inside the DB**
- Only **one transaction succeeds**
- Others fail instantly

### Result:

- No race condition
- No overselling
- Safe under high concurrency

---

## 3. Real-Time Updates

### Flow:

1. Reservation / Purchase happens
2. Backend updates DB
3. Emits Socket.IO event:

    ```ts
    io.emit("drop:update", data);
    ```

4. Frontend listens and updates data

### Why not manual state update?

- Avoids inconsistencies
- Keeps UI in sync with DB

---

## 4. Data Modeling Strategy

Key design choices:

- **Single stock source of truth**

    ```
    availableStock
    reservedStock
    soldStock
    ```

- **Reservation lifecycle**

    ```
    ACTIVE → COMPLETED / EXPIRED
    ```

- **Purchase tied to reservation**
    - Prevents duplicate purchases
    - Ensures ownership

---

# ⚠️ Limitations (Current Version)

- No authentication (need to select user)
- Background job uses recursive `setTimeout` (not safe for distributed systems)
- Single server instance (no horizontal scaling)

---

# 🚀 Future Improvements

- JWT Authentication
- Job queue (Redis + BullMQ) for distributed expiry processing
- Socket.IO scaling with Redis adapter
- Rate limiting (anti-bot protection)

---

# ✅ Summary

This system ensures:

- Real-time stock synchronization
- Strong consistency under high traffic
- Safe reservation & purchase flow
- Automatic stock recovery

---

# 👨‍💻 Author

Mohammad Tanim
