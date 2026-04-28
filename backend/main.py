import asyncio
import base64
import os
from pathlib import Path

import cv2
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from tracker import process_frame
from zones import check_breaches, draw_zone
from database import (
    init_db,
    save_alert,
    get_all_alerts,
    clear_alerts,
    alert_exists_recently,
)

app = FastAPI(title="SentinelAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

VIDEO_SOURCE = os.environ.get(
    "SENTINEL_VIDEO",
    str(Path(__file__).parent / "sample_video.mp4"),
)


@app.get("/")
def root():
    return {"status": "SentinelAI backend running", "video": VIDEO_SOURCE}


@app.get("/alerts")
def alerts():
    return get_all_alerts()


@app.delete("/alerts")
def reset_alerts():
    clear_alerts()
    return {"status": "cleared"}


@app.websocket("/ws")
async def video_stream(websocket: WebSocket):
    await websocket.accept()

    source = VIDEO_SOURCE
    if source.isdigit():
        source = int(source)

    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        msg = f"Could not open video source: {VIDEO_SOURCE}"
        print(f"[ws] {msg}")
        await websocket.send_json({"error": msg})
        await websocket.close()
        return
    print(f"[ws] streaming from {VIDEO_SOURCE}")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue

            frame = cv2.resize(frame, (640, 480))

            annotated_frame, tracked_objects = process_frame(frame)
            annotated_frame = draw_zone(annotated_frame)

            breaches = check_breaches(tracked_objects)
            for breach in breaches:
                if not alert_exists_recently(breach["track_id"], seconds=5):
                    save_alert(breach)

            ok, buffer = cv2.imencode(".jpg", annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            if not ok:
                continue
            encoded = base64.b64encode(buffer).decode("utf-8")

            await websocket.send_json({
                "frame": encoded,
                "object_count": len(tracked_objects),
                "breach_count": len(breaches),
            })

            await asyncio.sleep(0.033)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        cap.release()
        try:
            await websocket.close()
        except Exception:
            pass
