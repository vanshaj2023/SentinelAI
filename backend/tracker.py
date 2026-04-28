from ultralytics import YOLO

_model = YOLO("yolov8n.pt")


def process_frame(frame):
    results = _model.track(frame, persist=True, verbose=False)
    tracked_objects = []

    if results and results[0].boxes is not None:
        for box in results[0].boxes:
            coords = box.xyxy[0].tolist()
            track_id = int(box.id) if box.id is not None else -1
            conf = float(box.conf)
            cls_id = int(box.cls)
            label = _model.names[cls_id]

            tracked_objects.append({
                "id": track_id,
                "label": label,
                "confidence": round(conf, 2),
                "box": coords,
            })

    annotated_frame = results[0].plot() if results else frame
    return annotated_frame, tracked_objects
