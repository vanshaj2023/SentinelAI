"""Quick smoke test — confirm YOLO loads and runs on the sample video."""
from pathlib import Path
import cv2
from ultralytics import YOLO

VIDEO = Path(__file__).parent / "sample_video.mp4"

if not VIDEO.exists():
    raise SystemExit(f"Missing {VIDEO} — drop a demo video at this path.")

model = YOLO("yolov8n.pt")
cap = cv2.VideoCapture(str(VIDEO))
ret, frame = cap.read()
if not ret:
    raise SystemExit("Could not read first frame from video.")

results = model(frame)
print(f"Detected {len(results[0].boxes)} objects in first frame.")
print(f"Classes: {[model.names[int(b.cls)] for b in results[0].boxes]}")
cap.release()
