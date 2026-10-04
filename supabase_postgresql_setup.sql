-- HSG Guard Trace - PostgreSQL Database Setup Schema
-- Run this in your Supabase SQL Editor or directly in PostgreSQL (psql)

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker',
  shift TEXT,
  badge_id TEXT,
  batch_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Workers Table
CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  shift TEXT,
  badge_id TEXT,
  latest_exposure REAL DEFAULT 0.0,
  last_measurement TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Badges Table
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  batch TEXT NOT NULL,
  worker_id TEXT,
  manufactured TEXT,
  expiry TEXT,
  calibration TEXT,
  status TEXT DEFAULT 'VALID',
  measurements INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Measurements Table
CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY,
  trace_id TEXT,
  worker_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  shift TEXT,
  timestamp TEXT NOT NULL,
  time TEXT,
  exposure REAL NOT NULL DEFAULT 0.0,
  twa_ppm REAL DEFAULT 0.0,
  shift_duration_hours REAL DEFAULT 8.0,
  uncertainty TEXT,
  uncertainty_value REAL DEFAULT 0.15,
  lower_bound REAL DEFAULT 0.0,
  upper_bound REAL DEFAULT 0.0,
  calibration_range TEXT DEFAULT 'WITHIN VALIDATED RANGE',
  calibration_version TEXT,
  calibration TEXT,
  status TEXT NOT NULL,
  quality INT DEFAULT 94,
  temperature TEXT,
  humidity TEXT,
  color_r INT DEFAULT 0,
  color_g INT DEFAULT 0,
  color_b INT DEFAULT 0,
  source TEXT DEFAULT 'demo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Calibration Table
CREATE TABLE IF NOT EXISTS calibration (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  model TEXT NOT NULL,
  points INT DEFAULT 1001,
  r_squared REAL DEFAULT 0.998,
  rmse REAL DEFAULT 0.04,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. HSE Reviews Table
CREATE TABLE IF NOT EXISTS hse_reviews (
  id TEXT PRIMARY KEY,
  alert_id TEXT,
  worker_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  findings TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  category TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  status TEXT DEFAULT 'Success',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS & create public policies for Supabase PostgreSQL direct access
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hse_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on workers" ON workers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on badges" ON badges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on measurements" ON measurements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on calibration" ON calibration FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on alerts" ON alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on hse_reviews" ON hse_reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
