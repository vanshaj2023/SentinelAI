from datetime import datetime
import cv2

# Restricted zone in pixel coords for a 640x480 frame
RESTRICTED_ZONE = (150, 100, 500, 400)


def draw_zone(frame):
    x1, y1, x2, y2 = RESTRICTED_ZONE
    overlay = frame.copy()
    cv2.rectangle(overlay, (x1, y1), (x2, y2), (0, 0, 255), -1)
    cv2.addWeighted(overlay, 0.15, frame, 0.85, 0, frame)
    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
    cv2.putText(
        frame, "RESTRICTED ZONE", (x1, y1 - 10),
        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2,
    )
    return frame


def is_in_zone(box):
    x1, y1, x2, y2 = box
    cx = (x1 + x2) / 2
    cy = (y1 + y2) / 2
    zx1, zy1, zx2, zy2 = RESTRICTED_ZONE
    return zx1 < cx < zx2 and zy1 < cy < zy2


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
