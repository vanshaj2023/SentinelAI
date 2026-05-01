from typing import Optional
from pydantic import BaseModel


class TrackedObject(BaseModel):
    id: int
    label: str
    confidence: float
    box: list[float]


class Alert(BaseModel):
    id: int
    track_id: int
    label: str
    confidence: float
    timestamp: str


class FrameMessage(BaseModel):
    frame: str
    object_count: int
    breach_count: int


class ZoneConfig(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int
    label: Optional[str] = None
