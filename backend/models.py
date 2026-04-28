from pydantic import BaseModel


class TrackedObject(BaseModel):
    id: int
    label: str
    confidence: float
    box: list[float]


class Alert(BaseModel):
    track_id: int
    label: str
    confidence: float
    timestamp: str


class FrameMessage(BaseModel):
    frame: str
    object_count: int
    breach_count: int
