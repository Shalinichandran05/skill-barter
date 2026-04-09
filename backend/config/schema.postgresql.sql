-- ============================================================
-- SkillBarter – PostgreSQL Schema for Supabase
-- Run this in Supabase SQL Editor (supabase.com/dashboard → SQL Editor)
-- ============================================================

-- ── Users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(100)  NOT NULL,
  email          VARCHAR(150)  NOT NULL UNIQUE,
  password       VARCHAR(255)  NOT NULL,
  role           VARCHAR(10)   DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  credits        DECIMAL(10,2) DEFAULT 5.00,
  locked_credits DECIMAL(10,2) DEFAULT 0.00,
  bio            TEXT,
  mobile         VARCHAR(20),
  location       VARCHAR(255),
  avatar_url     TEXT,
  trust_score    DECIMAL(5,2)  DEFAULT 100.00,
  strike_count   INT           DEFAULT 0,
  is_blocked     BOOLEAN       DEFAULT FALSE,
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);

-- ── Skills ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skills (
  id               SERIAL PRIMARY KEY,
  user_id          INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_name       VARCHAR(150) NOT NULL,
  category         VARCHAR(100) NOT NULL,
  description      TEXT,
  availability     VARCHAR(255),
  credits_per_hour DECIMAL(5,2) DEFAULT 1.00,
  is_active        BOOLEAN      DEFAULT TRUE,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Skill Requests ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skill_requests (
  id                    SERIAL PRIMARY KEY,
  skill_id              INT          NOT NULL REFERENCES skills(id)  ON DELETE CASCADE,
  requester_id          INT          NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  provider_id           INT          NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  hours_requested       DECIMAL(5,2) NOT NULL,
  status                VARCHAR(30)  DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','waiting_confirmation','completed','disputed','rejected','cancelled')),
  provider_confirmed    BOOLEAN      DEFAULT NULL,
  requester_confirmed   BOOLEAN      DEFAULT NULL,
  confirmation_deadline TIMESTAMPTZ,
  message               TEXT,
  created_at            TIMESTAMPTZ  DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Credit Transactions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_transactions (
  id               SERIAL PRIMARY KEY,
  from_user        INT           REFERENCES users(id) ON DELETE SET NULL,
  to_user          INT           REFERENCES users(id) ON DELETE SET NULL,
  credits          DECIMAL(10,2) NOT NULL,
  transaction_type VARCHAR(20)   NOT NULL
                     CHECK (transaction_type IN ('earn','spend','lock','unlock','transfer','refund','bonus')),
  reference_id     INT,
  note             VARCHAR(255),
  created_at       TIMESTAMPTZ   DEFAULT NOW()
);

-- ── Ratings ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ratings (
  id         SERIAL PRIMARY KEY,
  from_user  INT NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
  to_user    INT NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
  request_id INT NOT NULL REFERENCES skill_requests(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (from_user, request_id)
);

-- ── Disputes ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disputes (
  id          SERIAL PRIMARY KEY,
  request_id  INT NOT NULL REFERENCES skill_requests(id) ON DELETE CASCADE,
  raised_by   INT NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  status      VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  resolution  TEXT,
  resolved_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ── Messages ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  sender_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_read     BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Seed: default admin account ────────────────────────────
-- Password: Admin@123  (bcrypt hash)
INSERT INTO users (name, email, password, role, credits)
VALUES (
  'Admin',
  'admin@skillbarter.io',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  999.00
) ON CONFLICT (email) DO NOTHING;
