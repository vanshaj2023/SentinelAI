from datetime import datetime
import threading
import cv2

_lock = threading.Lock()
_zone = {"x1": 150, "y1": 100, "x2": 500, "y2": 400, "label": "RESTRICTED ZONE"}


def get_zone():
    with _lock:
        return dict(_zone)


def set_zone(x1, y1, x2, y2, label=None):
    x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
    x1, x2 = sorted((max(0, x1), max(0, x2)))
    y1, y2 = sorted((max(0, y1), max(0, y2)))
    x2 = min(x2, 640)
    y2 = min(y2, 480)
    with _lock:
        _zone["x1"], _zone["y1"], _zone["x2"], _zone["y2"] = x1, y1, x2, y2
        if label:
            _zone["label"] = str(label)[:40]
    return get_zone()


def draw_zone(frame):
    z = get_zone()
    x1, y1, x2, y2 = z["x1"], z["y1"], z["x2"], z["y2"]
    overlay = frame.copy()
    cv2.rectangle(overlay, (x1, y1), (x2, y2), (0, 0, 255), -1)
    cv2.addWeighted(overlay, 0.15, frame, 0.85, 0, frame)
    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
    cv2.putText(
        frame, z["label"], (x1, max(15, y1 - 10)),
        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2,
    )
    return frame


def is_in_zone(box):
    z = get_zone()
    x1, y1, x2, y2 = box
    cx = (x1 + x2) / 2
    cy = (y1 + y2) / 2
    return z["x1"] < cx < z["x2"] and z["y1"] < cy < z["y2"]


def check_breaches(tracked_objects):
    breaches = []
    for obj in tracked_objects:
        if obj["id"] == -1:
            continue
        if is_in_zone(obj["box"]):
            breaches.append({
                "track_id": obj["id"],
                "label": obj["label"],
                "confidence": obj["confidence"],
                "timestamp": datetime.now().isoformat(),
            })
    return breaches
