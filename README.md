# SkillBarter — Time Credit Skill Exchange Platform

> A full-stack Progressive Web App where users exchange skills using **time credits** instead of money.
> Teach what you know. Learn what you want. No cash required.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Folder Structure](#3-folder-structure)
4. [Database Schema](#4-database-schema)
5. [API Reference](#5-api-reference)
6. [Business Logic](#6-business-logic)
7. [PWA Features](#7-pwa-features)
8. [Local Setup](#8-local-setup)
9. [Environment Variables](#9-environment-variables)
10. [Run Commands](#10-run-commands)
11. [Deployment](#11-deployment)

---

## 1. Project Overview

SkillBarter lets community members exchange skills peer-to-peer using a virtual time-credit economy:

- **New users** receive **5 free credits** on registration.
- **Providers** list skills they can teach (e.g. Python, Guitar, Yoga).
- **Learners** browse the directory and request sessions.
- Credits are **locked in escrow** when a request is approved.
- After the session, **both parties confirm** → credits transfer automatically.
- If confirmations conflict → an **admin dispute** is raised.
- All users build a **reputation via ratings** after each completed session.

---

## 2. Tech Stack

| Layer       | Technology                                      |
|-------------|--------------------------------------------------|
| Frontend    | React 18 · Vite · Tailwind CSS · React Router 6 |
| HTTP Client | Axios (with JWT interceptor)                    |
| Backend     | Node.js · Express.js                            |
| Database    | MySQL 8 (mysql2/promise, connection pool)       |
| Auth        | JWT (jsonwebtoken) · bcryptjs                   |
| PWA         | vite-plugin-pwa · Workbox · Web App Manifest    |
| Validation  | express-validator                               |
| Rate Limit  | express-rate-limit (100 req / 15 min / IP)      |
| Logging     | morgan                                          |
| Fonts       | Outfit · Playfair Display · JetBrains Mono      |

---

## 3. Folder Structure

```
skillbarter/
├── backend/
│   ├── config/
│   │   ├── db.js                  # MySQL connection pool
│   │   └── schema.sql             # Full DB schema + seed
│   ├── controllers/
│   │   ├── auth.controller.js     # Register, login, profile
│   │   ├── skill.controller.js    # CRUD for skills
│   │   ├── request.controller.js  # Session request lifecycle
│   │   ├── credit.controller.js   # Wallet + transactions
│   │   ├── rating.controller.js   # Post-session ratings
│   │   ├── admin.controller.js    # Admin operations
│   │   └── user.controller.js     # Public user profiles
│   ├── middleware/
│   │   ├── auth.middleware.js     # JWT protect + adminOnly
│   │   └── validate.middleware.js # express-validator handler
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── skill.routes.js
│   │   ├── request.routes.js
│   │   ├── credit.routes.js
│   │   ├── rating.routes.js
│   │   ├── admin.routes.js
│   │   └── user.routes.js
│   ├── .env.example
│   ├── package.json
│   └── server.js                  # Express entry point
│
└── frontend/
    ├── public/
    │   ├── manifest.json           # PWA manifest
    │   ├── sw.js                   # Custom service worker
    │   └── icons/                  # PWA icon sizes (see §7)
    ├── src/
    │   ├── components/
    │   │   ├── common/
    │   │   │   └── index.jsx       # StatusBadge, Stars, Modal, etc.
    │   │   └── layout/
    │   │       ├── DashboardLayout.jsx
    │   │       └── AdminLayout.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx     # Global auth state
    │   ├── pages/
    │   │   ├── Home.jsx            # Public landing page
    │   │   ├── Offline.jsx         # PWA offline fallback
    │   │   ├── auth/
    │   │   │   ├── AuthShell.jsx   # Shared auth layout
    │   │   │   ├── Login.jsx
    │   │   │   └── Register.jsx
    │   │   ├── user/
    │   │   │   ├── Dashboard.jsx   # Overview + stats
    │   │   │   ├── MySkills.jsx    # Add / edit / delete skills
    │   │   │   ├── BrowseSkills.jsx# Search + paginated listing
    │   │   │   ├── SkillDetail.jsx # Full skill + request form
    │   │   │   ├── MyRequests.jsx  # Sent + incoming + confirm
    │   │   │   ├── Wallet.jsx      # Credits + transaction log
    │   │   │   ├── Ratings.jsx     # Received ratings
    │   │   │   └── Profile.jsx     # Edit profile
    │   │   └── admin/
    │   │       ├── AdminDashboard.jsx
    │   │       ├── AdminUsers.jsx
    │   │       ├── AdminRequests.jsx
    │   │       └── AdminDisputes.jsx
    │   ├── services/
    │   │   └── api.js              # Axios instance + interceptors
    │   ├── App.jsx                 # Routes + guards
    │   ├── main.jsx                # ReactDOM entry
    │   └── index.css               # Tailwind + design tokens
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    └── vite.config.js
```

---

## 4. Database Schema

### `users`
| Column          | Type            | Notes                          |
|-----------------|-----------------|--------------------------------|
| id              | INT PK AI       |                                |
| name            | VARCHAR(100)    |                                |
| email           | VARCHAR(150)    | UNIQUE                         |
| password        | VARCHAR(255)    | bcrypt hash                    |
| role            | ENUM            | 'user' \| 'admin'              |
| credits         | DECIMAL(10,2)   | Default 5.00                   |
| locked_credits  | DECIMAL(10,2)   | Credits held in escrow         |
| bio             | TEXT            |                                |
| avatar_url      | VARCHAR(255)    |                                |
| is_blocked      | BOOLEAN         | Default FALSE                  |
| created_at      | TIMESTAMP       |                                |

### `skills`
| Column           | Type          | Notes                    |
|------------------|---------------|--------------------------|
| id               | INT PK AI     |                          |
| user_id          | INT FK        | → users.id               |
| skill_name       | VARCHAR(150)  |                          |
| category         | VARCHAR(100)  |                          |
| description      | TEXT          |                          |
| availability     | VARCHAR(255)  | Free text                |
| credits_per_hour | DECIMAL(5,2)  | Default 1.00             |
| is_active        | BOOLEAN       | Default TRUE             |
| created_at       | TIMESTAMP     |                          |

### `skill_requests`
| Column               | Type      | Notes                                          |
|----------------------|-----------|------------------------------------------------|
| id                   | INT PK AI |                                                |
| skill_id             | INT FK    | → skills.id                                    |
| requester_id         | INT FK    | → users.id                                     |
| provider_id          | INT FK    | → users.id                                     |
| hours_requested      | DECIMAL   |                                                |
| status               | ENUM      | pending→approved→waiting_confirmation→completed |
| provider_confirmed   | BOOLEAN   |                                                |
| requester_confirmed  | BOOLEAN   |                                                |
| message              | TEXT      | Intro from requester                           |
| created_at           | TIMESTAMP |                                                |
| updated_at           | TIMESTAMP | Auto-updates on change                         |

### `credit_transactions`
| Column           | Type      | Notes                               |
|------------------|-----------|-------------------------------------|
| id               | INT PK AI |                                     |
| from_user        | INT FK    | NULL for system (welcome bonus)     |
| to_user          | INT FK    |                                     |
| credits          | DECIMAL   |                                     |
| transaction_type | ENUM      | earn, spend, lock, unlock, transfer, refund, bonus |
| reference_id     | INT       | skill_request.id                    |
| note             | VARCHAR   |                                     |
| created_at       | TIMESTAMP |                                     |

### `ratings`
| Column     | Type      | Notes                               |
|------------|-----------|-------------------------------------|
| id         | INT PK AI |                                     |
| from_user  | INT FK    |                                     |
| to_user    | INT FK    |                                     |
| request_id | INT FK    | Unique per (from_user, request_id)  |
| rating     | TINYINT   | 1–5                                 |
| review     | TEXT      |                                     |
| created_at | TIMESTAMP |                                     |

### `disputes`
| Column      | Type      | Notes                               |
|-------------|-----------|-------------------------------------|
| id          | INT PK AI |                                     |
| request_id  | INT FK    |                                     |
| raised_by   | INT FK    |                                     |
| reason      | TEXT      |                                     |
| status      | ENUM      | open \| resolved \| dismissed       |
| resolution  | TEXT      |                                     |
| resolved_by | INT FK    |                                     |
| resolved_at | TIMESTAMP |                                     |
| created_at  | TIMESTAMP |                                     |

---

## 5. API Reference

### Auth  `POST /api/auth/...`
| Method | Endpoint        | Auth | Description         |
|--------|-----------------|------|---------------------|
| POST   | /register       | —    | Create account      |
| POST   | /login          | —    | Get JWT token       |
| GET    | /me             | JWT  | Get current user    |
| PUT    | /profile        | JWT  | Update profile      |

### Skills  `/api/skills`
| Method | Endpoint         | Auth | Description              |
|--------|------------------|------|--------------------------|
| GET    | /                | —    | Browse (search, filter)  |
| GET    | /categories      | —    | List all categories      |
| GET    | /mine            | JWT  | My own skills            |
| GET    | /:id             | —    | Single skill detail      |
| POST   | /                | JWT  | Add new skill            |
| PUT    | /:id             | JWT  | Edit skill (owner only)  |
| DELETE | /:id             | JWT  | Delete skill (owner only)|

### Requests  `/api/requests`
| Method | Endpoint         | Auth | Description              |
|--------|------------------|------|--------------------------|
| POST   | /                | JWT  | Create session request   |
| GET    | /mine            | JWT  | Sent requests            |
| GET    | /incoming        | JWT  | Received requests        |
| PUT    | /:id/respond     | JWT  | Approve or reject        |
| PUT    | /:id/confirm     | JWT  | Confirm session outcome  |

### Credits  `/api/credits`
| Method | Endpoint         | Auth | Description              |
|--------|------------------|------|--------------------------|
| GET    | /wallet          | JWT  | Balance breakdown        |
| GET    | /transactions    | JWT  | Last 50 transactions     |

### Ratings  `/api/ratings`
| Method | Endpoint           | Auth | Description            |
|--------|--------------------|------|------------------------|
| POST   | /                  | JWT  | Submit rating          |
| GET    | /user/:userId      | —    | User's received ratings|

### Admin  `/api/admin` *(admin JWT required)*
| Method | Endpoint                      | Description           |
|--------|-------------------------------|-----------------------|
| GET    | /stats                        | Platform totals       |
| GET    | /users                        | All users paginated   |
| PUT    | /users/:id/toggle-block       | Block / unblock       |
| GET    | /requests                     | All requests          |
| GET    | /disputes                     | All disputes          |
| PUT    | /disputes/:id/resolve         | Resolve dispute       |

---

## 6. Business Logic

### Credit Flow

```
Registration
  └─ +5 credits (welcome bonus, system transaction)

Request created
  └─ Check: requester.available_credits >= hours × credits_per_hour

Provider approves
  └─ requester.locked_credits += cost
  └─ Transaction: type=lock

Session happens (outside platform)

Both confirm = true
  └─ requester.credits -= cost
  └─ requester.locked_credits -= cost
  └─ provider.credits += cost
  └─ Transaction: type=transfer
  └─ Status → completed
  └─ Rating window opens

One confirms true, one confirms false
  └─ Status → disputed
  └─ Dispute record created
  └─ Credits remain locked until admin resolves

Both confirm = false
  └─ requester.locked_credits -= cost  (unlocked, not spent)
  └─ Status → cancelled
```

### Admin Dispute Resolution Options
- **Provider wins** → full credit transfer to provider
- **Requester wins** → credits unlocked back to requester (no transfer)
- **Split 50/50** → half to each party

---

## 7. PWA Features

### Required Icon Sizes
Generate icons at these sizes and place them in `frontend/public/icons/`:

```
icon-72.png    (72×72)
icon-96.png    (96×96)
icon-128.png   (128×128)
icon-144.png   (144×144)
icon-152.png   (152×152)
icon-192.png   (192×192)  ← maskable, Android home screen
icon-384.png   (384×384)
icon-512.png   (512×512)  ← maskable, splash screen
```

Recommended tool: https://realfavicongenerator.net or use `sharp` CLI:
```bash
npx sharp-cli --input logo.png --output public/icons/icon-192.png resize 192 192
```

### Caching Strategy
| Asset type   | Strategy      | TTL        |
|--------------|---------------|------------|
| API calls    | Network-first | 5 minutes  |
| JS / CSS     | Cache-first   | 30 days    |
| HTML pages   | Network-first | Session    |
| Icons/images | Cache-first   | 30 days    |
| Offline page | Pre-cached    | Always     |

### Install Prompt
The PWA install banner appears automatically in Chrome/Edge on Android and desktop when the app meets installability criteria (HTTPS + manifest + SW).

---

## 8. Local Setup

### Prerequisites
- Node.js v18+
- MySQL 8.0+
- npm or yarn

### Step 1 — Clone / unzip the project
```bash
cd skillbarter
```

### Step 2 — Database setup
```bash
# Log into MySQL
mysql -u root -p

# Run schema (creates DB, tables, seed admin account)
SOURCE backend/config/schema.sql;
EXIT;
```

### Step 3 — Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials and a strong JWT_SECRET
npm install
npm run dev       # nodemon, hot-reload on port 5000
```

### Step 4 — Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev       # Vite dev server on port 5173
```

Open `http://localhost:5173`

### Default Admin Account
```
Email:    admin@skillbarter.io
Password: Admin@123
```
> **Change this password immediately after first login via the Profile page.**

---

## 9. Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=skillbarter

JWT_SECRET=at_least_32_random_characters_here
JWT_EXPIRES_IN=7d

CLIENT_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=/api
# In production: VITE_API_URL=https://your-backend.onrender.com/api
```

---

## 10. Run Commands

### Development
```bash
# Backend (from /backend)
npm run dev          # nodemon – auto-restarts on file changes

# Frontend (from /frontend)
npm run dev          # Vite HMR dev server
```

### Production Build
```bash
# Frontend
cd frontend
npm run build        # Outputs to /frontend/dist
npm run preview      # Local preview of production build

# Backend
cd backend
npm start            # node server.js (no hot-reload)
```

### Database
```bash
mysql -u root -p skillbarter < backend/config/schema.sql   # fresh schema
```

---

## 11. Deployment

### A — MySQL Hosting (PlanetScale or Railway)

#### Option 1: Railway (recommended)
1. Go to https://railway.app → New Project → Add MySQL
2. Copy the connection string from Railway dashboard
3. Update backend `.env`:
   ```
   DB_HOST=containers.railway.app
   DB_PORT=<port>
   DB_USER=root
   DB_PASSWORD=<password>
   DB_NAME=railway
   ```
4. Connect to Railway MySQL and run:
   ```bash
   mysql -h <host> -P <port> -u root -p railway < backend/config/schema.sql
   ```

#### Option 2: PlanetScale
1. Create account at https://planetscale.com
2. Create database `skillbarter`
3. Get connection string → update `.env` variables
4. Note: PlanetScale uses its own branching — run the schema on `main` branch

---

### B — Backend Deployment (Render)

1. Push code to GitHub
2. Go to https://render.com → New Web Service
3. Connect your GitHub repo, set **Root Directory** to `backend`
4. Settings:
   ```
   Build Command:  npm install
   Start Command:  node server.js
   Environment:    Node
   ```
5. Add all environment variables from `backend/.env` in Render's dashboard
6. Set `NODE_ENV=production`
7. Set `CLIENT_URL=https://your-frontend.vercel.app`
8. Deploy → copy the service URL (e.g. `https://skillbarter-api.onrender.com`)

---

### C — Frontend Deployment (Vercel)

1. Go to https://vercel.com → New Project → Import GitHub repo
2. Set **Root Directory** to `frontend`
3. Framework preset: **Vite**
4. Add environment variable:
   ```
   VITE_API_URL=https://skillbarter-api.onrender.com/api
   ```
5. Deploy → Vercel gives you a `*.vercel.app` URL

> **Important:** After deploying, go back to Render and update `CLIENT_URL` to your Vercel URL to allow CORS.

---

### D — Full Production Checklist

- [ ] Change default admin password
- [ ] Set `NODE_ENV=production` on backend
- [ ] Use a strong, random `JWT_SECRET` (32+ chars)
- [ ] Enable HTTPS on both frontend and backend
- [ ] Set `CLIENT_URL` to exact frontend origin (no trailing slash)
- [ ] Generate and add all 8 PWA icon sizes to `public/icons/`
- [ ] Test install prompt on mobile Chrome
- [ ] Run `npm run build` and check bundle size with `vite preview`
- [ ] Verify service worker registers in Chrome DevTools → Application tab
- [ ] Test offline fallback by disabling network in DevTools

---

## Color Theme Reference

| Token                   | Hex       | Usage                        |
|-------------------------|-----------|------------------------------|
| `maroon-950`            | `#6b0f1a` | Primary buttons, accents     |
| `maroon-700`            | `#ac1538` | Hover states                 |
| `maroon-500`            | `#e04263` | Stars, highlights            |
| `surface-400` (body)    | `#0a0a0a` | Page background              |
| `surface-300` (sidebar) | `#0f0f0f` | Sidebar, cards               |
| `surface-50` (card)     | `#1a1a1a` | Card backgrounds             |

---

## Security Notes

- All passwords hashed with **bcrypt (10 rounds)**
- JWT tokens expire in **7 days** (configurable)
- Global rate limit: **100 requests / 15 min / IP**
- All SQL queries use **parameterised placeholders** (no string interpolation → no SQL injection)
- Body size capped at **10 KB** to prevent payload attacks
- Admin routes protected by **dual middleware** (JWT + role check)
- Blocked users receive **403** on login attempts
- Users cannot request their own skills

---

*SkillBarter — Built with Node.js, React, and a belief that everyone has something to teach.*
