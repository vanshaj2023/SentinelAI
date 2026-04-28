import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "alerts.db"


def init_db():
    conn = sqlite3.connect(DB_PATH)
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
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO alerts (track_id, label, confidence, timestamp) VALUES (?, ?, ?, ?)",
        (alert["track_id"], alert["label"], alert["confidence"], alert["timestamp"]),
    )
    conn.commit()
    conn.close()


def alert_exists_recently(track_id: int, seconds: int = 5) -> bool:
    """Avoid spamming the DB with the same track_id every frame."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.execute(
        "SELECT timestamp FROM alerts WHERE track_id = ? ORDER BY id DESC LIMIT 1",
        (track_id,),
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        return False
    from datetime import datetime
    last = datetime.fromisoformat(row[0])
    return (datetime.now() - last).total_seconds() < seconds


def get_all_alerts():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.execute(
        "SELECT track_id, label, confidence, timestamp FROM alerts ORDER BY id DESC LIMIT 100"
    )
    rows = cursor.fetchall()
    conn.close()
    return [
        {"track_id": r[0], "label": r[1], "confidence": r[2], "timestamp": r[3]}
        for r in rows
    ]


def clear_alerts():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM alerts")
    conn.commit()
    conn.close()
