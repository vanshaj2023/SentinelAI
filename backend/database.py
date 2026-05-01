import sqlite3
from collections import Counter
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "alerts.db"


def _conn():
    return sqlite3.connect(DB_PATH)


def init_db():
    conn = _conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_id INTEGER,
            label TEXT,
            confidence REAL,
            timestamp TEXT
        )
    """)
    conn.commit()
    conn.close()


def save_alert(alert):
    conn = _conn()
    conn.execute(
        "INSERT INTO alerts (track_id, label, confidence, timestamp) VALUES (?, ?, ?, ?)",
        (alert["track_id"], alert["label"], alert["confidence"], alert["timestamp"]),
    )
    conn.commit()
    conn.close()


def alert_exists_recently(track_id: int, seconds: int = 5) -> bool:
    conn = _conn()
    cursor = conn.execute(
        "SELECT timestamp FROM alerts WHERE track_id = ? ORDER BY id DESC LIMIT 1",
        (track_id,),
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        return False
    last = datetime.fromisoformat(row[0])
    return (datetime.now() - last).total_seconds() < seconds


def _row_to_dict(r):
    return {
        "id": r[0],
        "track_id": r[1],
        "label": r[2],
        "confidence": r[3],
        "timestamp": r[4],
    }


def get_all_alerts(limit: int = 100):
    conn = _conn()
    cursor = conn.execute(
        "SELECT id, track_id, label, confidence, timestamp FROM alerts "
        "ORDER BY id DESC LIMIT ?",
        (limit,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def get_alerts_in_window(start_iso: str | None, end_iso: str | None, label: str | None = None):
    sql = "SELECT id, track_id, label, confidence, timestamp FROM alerts WHERE 1=1"
    params: list = []
    if start_iso:
        sql += " AND timestamp >= ?"
        params.append(start_iso)
    if end_iso:
        sql += " AND timestamp <= ?"
        params.append(end_iso)
    if label:
        sql += " AND label = ?"
        params.append(label)
    sql += " ORDER BY id DESC LIMIT 500"
    conn = _conn()
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def get_alerts_stats():
    conn = _conn()
    rows = conn.execute(
        "SELECT label, track_id FROM alerts"
    ).fetchall()
    conn.close()
    if not rows:
        return {
            "total_alerts": 0,
            "unique_tracks": 0,
            "by_class": {},
            "unique_tracks_by_class": {},
        }
    by_class = Counter(r[0] for r in rows)
    tracks_by_class: dict[str, set] = {}
    for label, tid in rows:
        tracks_by_class.setdefault(label, set()).add(tid)
    return {
        "total_alerts": len(rows),
        "unique_tracks": len({r[1] for r in rows}),
        "by_class": dict(by_class),
        "unique_tracks_by_class": {k: len(v) for k, v in tracks_by_class.items()},
    }


def get_alerts_timeline(bucket_seconds: int = 60):
    conn = _conn()
    rows = conn.execute(
        "SELECT timestamp, label FROM alerts ORDER BY timestamp ASC"
    ).fetchall()
    conn.close()
    if not rows:
        return []
    buckets: dict[str, dict] = {}
    for ts, label in rows:
        try:
            t = datetime.fromisoformat(ts)
        except Exception:
            continue
        epoch = int(t.timestamp())
        bucket_start = epoch - (epoch % bucket_seconds)
        key = datetime.fromtimestamp(bucket_start).isoformat()
        b = buckets.setdefault(key, {"timestamp": key, "count": 0, "by_class": {}})
        b["count"] += 1
        b["by_class"][label] = b["by_class"].get(label, 0) + 1
    return [buckets[k] for k in sorted(buckets.keys())]


def clear_alerts():
    conn = _conn()
    conn.execute("DELETE FROM alerts")
    conn.commit()
    conn.close()
