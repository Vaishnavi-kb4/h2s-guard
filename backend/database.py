"""
PostgreSQL Database Driver & Persistence Module for H2S Guard Microservice

Handles connection pooling and saving workers, badges, measurements, calibration,
alerts, HSE reviews, audit logs, and users to PostgreSQL.
"""

import os
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, List, Optional

def get_db_url() -> str:
    """Reads database connection URL or individual environment variables for PostgreSQL."""
    if os.getenv("DATABASE_URL"):
        return os.getenv("DATABASE_URL")
    if os.getenv("POSTGRES_URL"):
        return os.getenv("POSTGRES_URL")
    
    user = os.getenv("PGUSER", os.getenv("POSTGRES_USER", "postgres"))
    password = os.getenv("PGPASSWORD", os.getenv("POSTGRES_PASSWORD", "postgres"))
    host = os.getenv("PGHOST", os.getenv("POSTGRES_HOST", "localhost"))
    port = os.getenv("PGPORT", os.getenv("POSTGRES_PORT", "5432"))
    dbname = os.getenv("PGDATABASE", os.getenv("POSTGRES_DB", "postgres"))
    
    return f"postgresql://{user}:{password}@{host}:{port}/{dbname}"

def get_db_connection():
    """Gets a raw psycopg2 PostgreSQL connection."""
    try:
        url = get_db_url()
        conn = psycopg2.connect(url, cursor_factory=RealDictCursor, connect_timeout=3)
        return conn
    except Exception as e:
        return None

# SQLite fallback storage for when PostgreSQL service is starting up or offline
FALLBACK_SQLITE_FILE = os.path.join(os.path.dirname(__file__), "h2s_fallback.db")

def get_fallback_conn():
    conn = sqlite3.connect(FALLBACK_SQLITE_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_postgres_db() -> bool:
    """Initializes PostgreSQL schema tables for Workers, Badges, Measurements, Calibration, Alerts, HSE Reviews, Audit Logs, Users."""
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
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

                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    category TEXT NOT NULL,
                    title TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'Open',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

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
                """)
                cur.execute("""
                INSERT INTO users (id, name, email, password, role, shift, badge_id, batch_id)
                VALUES 
                    ('HSE-901', 'Rajesh Sharma', 'hse.officer@plant.com', '123', 'monitor', 'General Shift', 'B-00000', 'BATCH-00'),
                    ('W-101', 'Arun Kumar', 'arun.kumar@plant.com', '123', 'worker', 'Morning Shift', 'B-00101', 'BATCH-01')
                ON CONFLICT (id) DO NOTHING;

                INSERT INTO workers (id, name, shift, badge_id, latest_exposure, last_measurement, status)
                VALUES ('W-101', 'Arun Kumar', 'Morning Shift', 'B-00101', 0.0, 'Registered worker', 'Active')
                ON CONFLICT (id) DO NOTHING;

                INSERT INTO badges (id, batch, worker_id, manufactured, expiry, calibration, status, measurements)
                VALUES ('B-00101', 'BATCH-01', 'W-101', '20-Sep-2026', '20-Dec-2026', 'CAL-03', 'VALID', 0)
                ON CONFLICT (id) DO NOTHING;

                INSERT INTO calibration (id, version, model, points, r_squared, rmse, status)
                VALUES ('CAL-03', 'v1.0.4', 'SentraBand PCHIP + CIEDE2000 LUT Model', 1001, 0.998, 0.04, 'ACTIVE')
                ON CONFLICT (id) DO NOTHING;
                """)
                conn.commit()
                print("[PostgreSQL] All 8 schema tables initialized and seeded successfully in PostgreSQL!")
                return True
        except Exception as err:
            print(f"[PostgreSQL] Schema Init Error: {err}")
        finally:
            conn.close()

    # Fallback to local SQLite initialization
    try:
        fconn = get_fallback_conn()
        cur = fconn.cursor()
        cur.executescript("""
        CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, email TEXT, password TEXT, role TEXT, shift TEXT, badge_id TEXT, batch_id TEXT, created_at TEXT);
        CREATE TABLE IF NOT EXISTS workers (id TEXT PRIMARY KEY, name TEXT, shift TEXT, badge_id TEXT, latest_exposure REAL, last_measurement TEXT, status TEXT, created_at TEXT);
        CREATE TABLE IF NOT EXISTS badges (id TEXT PRIMARY KEY, batch TEXT, worker_id TEXT, manufactured TEXT, expiry TEXT, calibration TEXT, status TEXT, measurements INT, created_at TEXT);
        CREATE TABLE IF NOT EXISTS measurements (id TEXT PRIMARY KEY, trace_id TEXT, worker_id TEXT, badge_id TEXT, batch_id TEXT, shift TEXT, timestamp TEXT, time TEXT, exposure REAL, twa_ppm REAL, shift_duration_hours REAL, uncertainty TEXT, uncertainty_value REAL, lower_bound REAL, upper_bound REAL, calibration_range TEXT, calibration_version TEXT, calibration TEXT, status TEXT, quality INT, temperature TEXT, humidity TEXT, color_r INT, color_g INT, color_b INT, source TEXT, created_at TEXT);
        CREATE TABLE IF NOT EXISTS calibration (id TEXT PRIMARY KEY, version TEXT, model TEXT, points INT, r_squared REAL, rmse REAL, status TEXT, created_at TEXT);
        CREATE TABLE IF NOT EXISTS alerts (id TEXT PRIMARY KEY, category TEXT, title TEXT, subject TEXT, reason TEXT, status TEXT, created_at TEXT);
        CREATE TABLE IF NOT EXISTS hse_reviews (id TEXT PRIMARY KEY, alert_id TEXT, worker_id TEXT, reviewer_id TEXT, findings TEXT, action_taken TEXT, status TEXT, created_at TEXT);
        CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, timestamp TEXT, user_id TEXT, user_name TEXT, action TEXT, category TEXT, details TEXT, ip_address TEXT, status TEXT, created_at TEXT);

        INSERT OR IGNORE INTO users (id, name, email, password, role, shift, badge_id, batch_id) VALUES ('HSE-901', 'Rajesh Sharma', 'hse.officer@plant.com', '123', 'monitor', 'General Shift', 'B-00000', 'BATCH-00');
        INSERT OR IGNORE INTO users (id, name, email, password, role, shift, badge_id, batch_id) VALUES ('W-101', 'Arun Kumar', 'arun.kumar@plant.com', '123', 'worker', 'Morning Shift', 'B-00101', 'BATCH-01');
        INSERT OR IGNORE INTO workers (id, name, shift, badge_id, latest_exposure, last_measurement, status) VALUES ('W-101', 'Arun Kumar', 'Morning Shift', 'B-00101', 0.0, 'Registered worker', 'Active');
        INSERT OR IGNORE INTO badges (id, batch, worker_id, manufactured, expiry, calibration, status, measurements) VALUES ('B-00101', 'BATCH-01', 'W-101', '20-Sep-2026', '20-Dec-2026', 'CAL-03', 'VALID', 0);
        INSERT OR IGNORE INTO calibration (id, version, model, points, r_squared, rmse, status) VALUES ('CAL-03', 'v1.0.4', 'SentraBand PCHIP + CIEDE2000 LUT Model', 1001, 0.998, 0.04, 'ACTIVE');
        """)
        fconn.commit()
        fconn.close()
        print("[Database] SQLite local persistence active (Fallback mode).")
        return True
    except Exception as e:
        print(f"[Database] Fallback init error: {e}")
        return False

# --- WORKERS ---
def get_all_workers_from_postgres() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name, shift, badge_id as \"badgeId\", latest_exposure as \"latestExposure\", last_measurement as \"lastMeasurement\", status FROM workers ORDER BY created_at DESC;")
                return [dict(r) for r in cur.fetchall()]
        except Exception as e:
            print("PG get_workers error:", e)
        finally:
            conn.close()
    
    # Fallback
    try:
        fconn = get_fallback_conn()
        cur = fconn.cursor()
        cur.execute("SELECT id, name, shift, badge_id as badgeId, latest_exposure as latestExposure, last_measurement as lastMeasurement, status FROM workers ORDER BY rowid DESC;")
        res = [dict(r) for r in cur.fetchall()]
        fconn.close()
        return res
    except:
        return []

def save_worker_to_postgres(worker: Dict[str, Any]) -> bool:
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                INSERT INTO workers (id, name, shift, badge_id, latest_exposure, last_measurement, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    shift = EXCLUDED.shift,
                    badge_id = EXCLUDED.badge_id,
                    latest_exposure = EXCLUDED.latest_exposure,
                    last_measurement = EXCLUDED.last_measurement,
                    status = EXCLUDED.status;
                """, (
                    worker.get("id"),
                    worker.get("name"),
                    worker.get("shift"),
                    worker.get("badgeId"),
                    worker.get("latestExposure", 0.0),
                    worker.get("lastMeasurement", "Registered worker"),
                    worker.get("status", "Active"),
                ))
                conn.commit()
                return True
        except Exception as e:
            print("PG save_worker error:", e)
        finally:
            conn.close()

    try:
        fconn = get_fallback_conn()
        cur = fconn.cursor()
        cur.execute("""
        INSERT INTO workers (id, name, shift, badge_id, latest_exposure, last_measurement, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
            name = excluded.name, shift = excluded.shift, badge_id = excluded.badge_id,
            latest_exposure = excluded.latest_exposure, last_measurement = excluded.last_measurement, status = excluded.status;
        """, (
            worker.get("id"), worker.get("name"), worker.get("shift"), worker.get("badgeId"),
            worker.get("latestExposure", 0.0), worker.get("lastMeasurement", "Registered worker"), worker.get("status", "Active")
        ))
        fconn.commit()
        fconn.close()
        return True
    except:
        return False

# --- BADGES ---
def get_all_badges_from_postgres() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT id, batch, worker_id as \"workerId\", manufactured, expiry, calibration, status, measurements FROM badges ORDER BY created_at DESC;")
                return [dict(r) for r in cur.fetchall()]
        except Exception as e:
            print("PG get_badges error:", e)
        finally:
            conn.close()
            
    try:
        fconn = get_fallback_conn()
        cur = fconn.cursor()
        cur.execute("SELECT id, batch, worker_id as workerId, manufactured, expiry, calibration, status, measurements FROM badges ORDER BY rowid DESC;")
        res = [dict(r) for r in cur.fetchall()]
        fconn.close()
        return res
    except:
        return []

def save_badge_to_postgres(badge: Dict[str, Any]) -> bool:
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                INSERT INTO badges (id, batch, worker_id, manufactured, expiry, calibration, status, measurements)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    batch = EXCLUDED.batch,
                    worker_id = EXCLUDED.worker_id,
                    status = EXCLUDED.status,
                    measurements = EXCLUDED.measurements;
                """, (
                    badge.get("id"),
                    badge.get("batch"),
                    badge.get("workerId"),
                    badge.get("manufactured", "20-Sep-2026"),
                    badge.get("expiry", "20-Dec-2026"),
                    badge.get("calibration", "CAL-03"),
                    badge.get("status", "VALID"),
                    badge.get("measurements", 0),
                ))
                conn.commit()
                return True
        except Exception as e:
            print("PG save_badge error:", e)
        finally:
            conn.close()

    try:
        fconn = get_fallback_conn()
        cur = fconn.cursor()
        cur.execute("""
        INSERT INTO badges (id, batch, worker_id, manufactured, expiry, calibration, status, measurements)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET batch = excluded.batch, worker_id = excluded.worker_id, status = excluded.status, measurements = excluded.measurements;
        """, (
            badge.get("id"), badge.get("batch"), badge.get("workerId"), badge.get("manufactured", "20-Sep-2026"),
            badge.get("expiry", "20-Dec-2026"), badge.get("calibration", "CAL-03"), badge.get("status", "VALID"), badge.get("measurements", 0)
        ))
        fconn.commit()
        fconn.close()
        return True
    except:
        return False

# --- MEASUREMENTS ---
def get_all_measurements_from_postgres() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                SELECT 
                    id, trace_id as "traceId", worker_id as "workerId", badge_id as "badgeId", batch_id as "batchId",
                    shift, timestamp, time, exposure, twa_ppm as "twaPpm", shift_duration_hours as "shiftDurationHours",
                    uncertainty, uncertainty_value as "uncertaintyValue", lower_bound as "lowerBound", upper_bound as "upperBound",
                    calibration_range as "calibrationRange", calibration_version as "calibrationVersion", calibration,
                    status, quality, temperature, humidity, color_r, color_g, color_b, source
                FROM measurements ORDER BY created_at DESC;
                """)
                rows = cur.fetchall()
                res = []
                for r in rows:
                    d = dict(r)
                    d["color"] = {"r": d.pop("color_r", 105), "g": d.pop("color_g", 85), "b": d.pop("color_b", 70)}
                    res.append(d)
                return res
        except Exception as e:
            print("PG get_measurements error:", e)
        finally:
            conn.close()

    try:
        fconn = get_fallback_conn()
        cur = fconn.cursor()
        cur.execute("""
        SELECT 
            id, trace_id as "traceId", worker_id as "workerId", badge_id as "badgeId", batch_id as "batchId",
            shift, timestamp, time, exposure, twa_ppm as "twaPpm", shift_duration_hours as "shiftDurationHours",
            uncertainty, uncertainty_value as "uncertaintyValue", lower_bound as "lowerBound", upper_bound as "upperBound",
            calibration_range as "calibrationRange", calibration_version as "calibrationVersion", calibration,
            status, quality, temperature, humidity, color_r, color_g, color_b, source
        FROM measurements ORDER BY rowid DESC;
        """)
        rows = cur.fetchall()
        res = []
        for r in rows:
            d = dict(r)
            d["color"] = {"r": d.pop("color_r", 105), "g": d.pop("color_g", 85), "b": d.pop("color_b", 70)}
            res.append(d)
        fconn.close()
        return res
    except:
        return []

def save_measurement_to_postgres(m: Dict[str, Any]) -> bool:
    color = m.get("color") or {}
    cr = color.get("r", 105)
    cg = color.get("g", 85)
    cb = color.get("b", 70)

    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                INSERT INTO measurements (
                    id, trace_id, worker_id, badge_id, batch_id, shift, timestamp, time,
                    exposure, twa_ppm, shift_duration_hours, uncertainty, uncertainty_value,
                    lower_bound, upper_bound, calibration_range, calibration_version, calibration,
                    status, quality, temperature, humidity, color_r, color_g, color_b, source
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    exposure = EXCLUDED.exposure,
                    twa_ppm = EXCLUDED.twa_ppm,
                    status = EXCLUDED.status;
                """, (
                    m.get("id"),
                    m.get("traceId", f"TRACE-{m.get('id')}"),
                    m.get("workerId"),
                    m.get("badgeId"),
                    m.get("batchId", "BATCH-01"),
                    m.get("shift", "Morning"),
                    m.get("timestamp", "Just recorded"),
                    m.get("time", "12:00 PM"),
                    m.get("exposure", 0.0),
                    m.get("twaPpm", 0.0),
                    m.get("shiftDurationHours", 8.0),
                    m.get("uncertainty", "±0.15 ppm·h"),
                    m.get("uncertaintyValue", 0.15),
                    m.get("lowerBound", 0.0),
                    m.get("upperBound", 0.0),
                    m.get("calibrationRange", "WITHIN VALIDATED RANGE"),
                    m.get("calibrationVersion", "SentraBand PCHIP + CIEDE2000 LUT Model"),
                    m.get("calibration", "CAL-03 Model"),
                    m.get("status", "VALID"),
                    m.get("quality", 94),
                    m.get("temperature", "31.2 °C"),
                    m.get("humidity", "68% RH"),
                    cr, cg, cb,
                    m.get("source", "demo")
                ))
                conn.commit()

                # Automatically update worker's latest exposure
                if m.get("workerId"):
                    cur.execute("""
                    UPDATE workers SET latest_exposure = %s, last_measurement = %s WHERE id = %s;
                    """, (m.get("exposure", 0.0), m.get("time"), m.get("workerId")))
                    conn.commit()

                return True
        except Exception as e:
            print("PG save_measurement error:", e)
        finally:
            conn.close()

    try:
        fconn = get_fallback_conn()
        cur = fconn.cursor()
        cur.execute("""
        INSERT INTO measurements (
            id, trace_id, worker_id, badge_id, batch_id, shift, timestamp, time,
            exposure, twa_ppm, shift_duration_hours, uncertainty, uncertainty_value,
            lower_bound, upper_bound, calibration_range, calibration_version, calibration,
            status, quality, temperature, humidity, color_r, color_g, color_b, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET exposure = excluded.exposure, twa_ppm = excluded.twa_ppm, status = excluded.status;
        """, (
            m.get("id"), m.get("traceId", f"TRACE-{m.get('id')}"), m.get("workerId"), m.get("badgeId"),
            m.get("batchId", "BATCH-01"), m.get("shift", "Morning"), m.get("timestamp", "Just recorded"),
            m.get("time", "12:00 PM"), m.get("exposure", 0.0), m.get("twaPpm", 0.0), m.get("shiftDurationHours", 8.0),
            m.get("uncertainty", "±0.15 ppm·h"), m.get("uncertaintyValue", 0.15), m.get("lowerBound", 0.0),
            m.get("upperBound", 0.0), m.get("calibrationRange", "WITHIN VALIDATED RANGE"),
            m.get("calibrationVersion", "SentraBand PCHIP + CIEDE2000 LUT Model"), m.get("calibration", "CAL-03 Model"),
            m.get("status", "VALID"), m.get("quality", 94), m.get("temperature", "31.2 °C"), m.get("humidity", "68% RH"),
            cr, cg, cb, m.get("source", "demo")
        ))
        fconn.commit()
        fconn.close()
        return True
    except Exception as e:
        print("Fallback save_measurement error:", e)
        return False

# --- CALIBRATION ---
def get_all_calibrations_from_postgres() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT id, version, model, points, r_squared as \"rSquared\", rmse, status, created_at as \"createdAt\" FROM calibration ORDER BY created_at DESC;")
                return [dict(r) for r in cur.fetchall()]
        except Exception as e:
            print("PG get_calibration error:", e)
        finally:
            conn.close()

    try:
        fconn = get_fallback_conn()
        cur = fconn.cursor()
        cur.execute("SELECT id, version, model, points, r_squared as rSquared, rmse, status, created_at as createdAt FROM calibration;")
        res = [dict(r) for r in cur.fetchall()]
        fconn.close()
        return res
    except:
        return []

def save_calibration_to_postgres(cal: Dict[str, Any]) -> bool:
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                INSERT INTO calibration (id, version, model, points, r_squared, rmse, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version, status = EXCLUDED.status;
                """, (
                    cal.get("id"), cal.get("version"), cal.get("model"),
                    cal.get("points", 1001), cal.get("rSquared", 0.998), cal.get("rmse", 0.04), cal.get("status", "ACTIVE")
                ))
                conn.commit()
                return True
        except Exception as e:
            print("PG save_calibration error:", e)
        finally:
            conn.close()
    return False

# --- ALERTS ---
def get_all_alerts_from_postgres() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT id, category, title, subject, reason, status FROM alerts ORDER BY created_at DESC;")
                return [dict(r) for r in cur.fetchall()]
        except Exception as e:
            print("PG get_alerts error:", e)
        finally:
            conn.close()

    try:
        fconn = get_fallback_conn()
        cur = fconn.cursor()
        cur.execute("SELECT id, category, title, subject, reason, status FROM alerts ORDER BY rowid DESC;")
        res = [dict(r) for r in cur.fetchall()]
        fconn.close()
        return res
    except:
        return []

def save_alert_to_postgres(alert: Dict[str, Any]) -> bool:
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                INSERT INTO alerts (id, category, title, subject, reason, status)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
                """, (
                    alert.get("id"), alert.get("category"), alert.get("title"),
                    alert.get("subject"), alert.get("reason"), alert.get("status", "Open")
                ))
                conn.commit()
                return True
        except Exception as e:
            print("PG save_alert error:", e)
        finally:
            conn.close()

    try:
        fconn = get_fallback_conn()
        cur = fconn.cursor()
        cur.execute("""
        INSERT INTO alerts (id, category, title, subject, reason, status)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET status = excluded.status;
        """, (
            alert.get("id"), alert.get("category"), alert.get("title"),
            alert.get("subject"), alert.get("reason"), alert.get("status", "Open")
        ))
        fconn.commit()
        fconn.close()
        return True
    except:
        return False

# --- HSE REVIEWS ---
def get_all_hse_reviews_from_postgres() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT id, alert_id as \"alertId\", worker_id as \"workerId\", reviewer_id as \"reviewerId\", findings, action_taken as \"actionTaken\", status, created_at as \"createdAt\" FROM hse_reviews ORDER BY created_at DESC;")
                return [dict(r) for r in cur.fetchall()]
        except Exception as e:
            print("PG get_hse_reviews error:", e)
        finally:
            conn.close()

    try:
        fconn = get_fallback_conn()
        cur = fconn.cursor()
        cur.execute("SELECT id, alert_id as alertId, worker_id as workerId, reviewer_id as reviewerId, findings, action_taken as actionTaken, status, created_at as createdAt FROM hse_reviews;")
        res = [dict(r) for r in cur.fetchall()]
        fconn.close()
        return res
    except:
        return []

def save_hse_review_to_postgres(review: Dict[str, Any]) -> bool:
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                INSERT INTO hse_reviews (id, alert_id, worker_id, reviewer_id, findings, action_taken, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, findings = EXCLUDED.findings;
                """, (
                    review.get("id"), review.get("alertId"), review.get("workerId"),
                    review.get("reviewerId"), review.get("findings"), review.get("actionTaken"), review.get("status", "Completed")
                ))
                conn.commit()
                return True
        except Exception as e:
            print("PG save_hse_review error:", e)
        finally:
            conn.close()

    try:
        fconn = get_fallback_conn()
        cur = fconn.cursor()
        cur.execute("""
        INSERT INTO hse_reviews (id, alert_id, worker_id, reviewer_id, findings, action_taken, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET status = excluded.status, findings = excluded.findings;
        """, (
            review.get("id"), review.get("alertId"), review.get("workerId"),
            review.get("reviewerId"), review.get("findings"), review.get("actionTaken"), review.get("status", "Completed")
        ))
        fconn.commit()
        fconn.close()
        return True
    except:
        return False

# --- AUDIT LOGS ---
def get_all_audit_logs_from_postgres() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT id, timestamp, user_id as \"userId\", user_name as \"userName\", action, category, details, ip_address as \"ipAddress\", status FROM audit_logs ORDER BY created_at DESC;")
                return [dict(r) for r in cur.fetchall()]
        except Exception as e:
            print("PG get_audit_logs error:", e)
        finally:
            conn.close()

    try:
        fconn = get_fallback_conn()
        cur = fconn.cursor()
        cur.execute("SELECT id, timestamp, user_id as userId, user_name as userName, action, category, details, ip_address as ipAddress, status FROM audit_logs ORDER BY rowid DESC;")
        res = [dict(r) for r in cur.fetchall()]
        fconn.close()
        return res
    except:
        return []

def save_audit_log_to_postgres(log: Dict[str, Any]) -> bool:
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                INSERT INTO audit_logs (id, timestamp, user_id, user_name, action, category, details, ip_address, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING;
                """, (
                    log.get("id"), log.get("timestamp"), log.get("userId"),
                    log.get("userName"), log.get("action"), log.get("category"),
                    log.get("details"), log.get("ipAddress", "127.0.0.1"), log.get("status", "Success")
                ))
                conn.commit()
                return True
        except Exception as e:
            print("PG save_audit_log error:", e)
        finally:
            conn.close()

    try:
        fconn = get_fallback_conn()
        cur = fconn.cursor()
        cur.execute("""
        INSERT INTO audit_logs (id, timestamp, user_id, user_name, action, category, details, ip_address, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO NOTHING;
        """, (
            log.get("id"), log.get("timestamp"), log.get("userId"),
            log.get("userName"), log.get("action"), log.get("category"),
            log.get("details"), log.get("ipAddress", "127.0.0.1"), log.get("status", "Success")
        ))
        fconn.commit()
        fconn.close()
        return True
    except:
        return False

# --- USERS ---
def get_all_users_from_postgres() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name, email, password, role, shift, badge_id as \"badgeId\", batch_id as \"batchId\", created_at as \"createdAt\" FROM users ORDER BY created_at DESC;")
                return [dict(r) for r in cur.fetchall()]
        except Exception as e:
            print("PG get_users error:", e)
        finally:
            conn.close()

    try:
        fconn = get_fallback_conn()
        cur = fconn.cursor()
        cur.execute("SELECT id, name, email, password, role, shift, badge_id as badgeId, batch_id as batchId, created_at as createdAt FROM users;")
        res = [dict(r) for r in cur.fetchall()]
        fconn.close()
        return res
    except:
        return []

def save_user_to_postgres(user: Dict[str, Any]) -> bool:
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                INSERT INTO users (id, name, email, password, role, shift, badge_id, batch_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name, email = EXCLUDED.email, password = EXCLUDED.password,
                    role = EXCLUDED.role, shift = EXCLUDED.shift, badge_id = EXCLUDED.badge_id, batch_id = EXCLUDED.batch_id;
                """, (
                    user.get("id"), user.get("name"), user.get("email"), user.get("password"),
                    user.get("role", "worker"), user.get("shift"), user.get("badgeId"), user.get("batchId")
                ))
                conn.commit()
                return True
        except Exception as e:
            print("PG save_user error:", e)
        finally:
            conn.close()

    try:
        fconn = get_fallback_conn()
        cur = fconn.cursor()
        cur.execute("""
        INSERT INTO users (id, name, email, password, role, shift, badge_id, batch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
            name = excluded.name, email = excluded.email, password = excluded.password,
            role = excluded.role, shift = excluded.shift, badge_id = excluded.badge_id, batch_id = excluded.batch_id;
        """, (
            user.get("id"), user.get("name"), user.get("email"), user.get("password"),
            user.get("role", "worker"), user.get("shift"), user.get("badgeId"), user.get("batchId")
        ))
        fconn.commit()
        fconn.close()
        return True
    except:
        return False

# --- FULL DB STATE ---
def get_full_db_state() -> Dict[str, Any]:
    return {
        "workers": get_all_workers_from_postgres(),
        "badges": get_all_badges_from_postgres(),
        "measurements": get_all_measurements_from_postgres(),
        "calibration": get_all_calibrations_from_postgres(),
        "alerts": get_all_alerts_from_postgres(),
        "hseReviews": get_all_hse_reviews_from_postgres(),
        "auditLogs": get_all_audit_logs_from_postgres(),
        "users": get_all_users_from_postgres(),
    }
