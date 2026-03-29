-- ============================================================
-- SkillBarter – Time Credit Skill Exchange Platform
-- Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS skillbarter;
USE skillbarter;

-- ── Users ──────────────────────────────────────────────────
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  password      VARCHAR(255)  NOT NULL,
  role          ENUM('user','admin') DEFAULT 'user',
  credits       DECIMAL(10,2) DEFAULT 5.00,   -- starting credits
  locked_credits DECIMAL(10,2) DEFAULT 0.00,  -- credits held in escrow
  bio           TEXT,
  avatar_url    VARCHAR(255),
  is_blocked    BOOLEAN       DEFAULT FALSE,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ── Skills ─────────────────────────────────────────────────
CREATE TABLE skills (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT          NOT NULL,
  skill_name   VARCHAR(150) NOT NULL,
  category     VARCHAR(100) NOT NULL,
  description  TEXT,
  availability VARCHAR(255),                  -- e.g. "Weekends, Evenings"
  credits_per_hour DECIMAL(5,2) DEFAULT 1.00,
  is_active    BOOLEAN      DEFAULT TRUE,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Skill Requests ─────────────────────────────────────────
CREATE TABLE skill_requests (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  skill_id             INT NOT NULL,
  requester_id         INT NOT NULL,
  provider_id          INT NOT NULL,
  hours_requested      DECIMAL(5,2) NOT NULL,
  status               ENUM(
                         'pending',
                         'approved',
                         'waiting_confirmation',
                         'completed',
                         'disputed',
                         'rejected',
                         'cancelled'
                       ) DEFAULT 'pending',
  provider_confirmed   BOOLEAN DEFAULT FALSE,
  requester_confirmed  BOOLEAN DEFAULT FALSE,
  message              TEXT,                  -- requester's intro message
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (skill_id)     REFERENCES skills(id)  ON DELETE CASCADE,
  FOREIGN KEY (requester_id) REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY (provider_id)  REFERENCES users(id)   ON DELETE CASCADE
);

-- ── Credit Transactions ────────────────────────────────────
CREATE TABLE credit_transactions (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  from_user        INT,                        -- NULL for system grants
  to_user          INT,
  credits          DECIMAL(10,2) NOT NULL,
  transaction_type ENUM(
                     'earn',
                     'spend',
                     'lock',
                     'unlock',
                     'transfer',
                     'refund',
                     'bonus'
                   ) NOT NULL,
  reference_id     INT,                        -- skill_request id
  note             VARCHAR(255),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_user) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (to_user)   REFERENCES users(id) ON DELETE SET NULL
);

-- ── Ratings ────────────────────────────────────────────────
CREATE TABLE ratings (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  from_user   INT NOT NULL,
  to_user     INT NOT NULL,
  request_id  INT NOT NULL,
  rating      TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review      TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_rating (from_user, request_id),  -- one rating per session
  FOREIGN KEY (from_user)  REFERENCES users(id)          ON DELETE CASCADE,
  FOREIGN KEY (to_user)    REFERENCES users(id)          ON DELETE CASCADE,
  FOREIGN KEY (request_id) REFERENCES skill_requests(id) ON DELETE CASCADE
);

-- ── Disputes ───────────────────────────────────────────────
CREATE TABLE disputes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  raised_by  INT NOT NULL,
  reason     TEXT NOT NULL,
  status     ENUM('open','resolved','dismissed') DEFAULT 'open',
  resolution TEXT,
  resolved_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  FOREIGN KEY (request_id)  REFERENCES skill_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (raised_by)   REFERENCES users(id)          ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES users(id)          ON DELETE SET NULL
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
);
