from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class ParkingSlotORM(Base):
    __tablename__ = "parking_slots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    node_id: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    label: Mapped[str] = mapped_column(String(32), unique=True)
    row: Mapped[int] = mapped_column(Integer, index=True)
    col: Mapped[int] = mapped_column(Integer, index=True)
    status: Mapped[str] = mapped_column(String(16), default="available", index=True)
    x: Mapped[float] = mapped_column(Float)
    y: Mapped[float] = mapped_column(Float)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class UserORM(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password: Mapped[str] = mapped_column(String(256))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class VehicleORM(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    vehicle_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    owner_name: Mapped[str] = mapped_column(String(80))
    vehicle_type: Mapped[str] = mapped_column(String(20), default="standard", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ParkingSessionORM(Base):
    __tablename__ = "parking_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"), index=True)
    slot_node_id: Mapped[str] = mapped_column(String(16), index=True)
    algorithm: Mapped[str] = mapped_column(String(20), default="astar")
    entered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    exited_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class LoginRequest(BaseModel):
    username: str
    password: str


class Location(BaseModel):
    row: int
    col: int


class ParkingSlot(BaseModel):
    node_id: str
    label: str
    row: int
    col: int
    status: str
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None

    model_config = {"from_attributes": True}


class ParkingDataResponse(BaseModel):
    rows: int
    cols: int
    total_slots: int
    available_slots: int
    occupied_slots: int
    slots: List[ParkingSlot]
    server_time: datetime


class FindSlotRequest(BaseModel):
    current_node: str
    algorithm: str = "astar"
    vehicle_number: Optional[str] = None
    vehicle_type: Optional[str] = None


class RouteResponse(BaseModel):
    algorithm: str
    target_node: str
    target_label: str
    path: List[str]
    distance: int
    estimated_minutes: float


class SimulateUpdateResponse(BaseModel):
    changed_slots: int
    server_time: datetime


class AuthResponse(BaseModel):
    token: str
    username: str
    expires_in_seconds: int = 3600


class UserCreateRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    username: str
    created_at: datetime


class VehicleCreateRequest(BaseModel):
    vehicle_number: str
    owner_name: str
    vehicle_type: str = "standard"


class VehicleResponse(BaseModel):
    vehicle_number: str
    owner_name: str
    vehicle_type: str
    created_at: datetime


class CheckInRequest(BaseModel):
    vehicle_number: str
    current_node: str
    algorithm: str = "astar"


class CheckOutRequest(BaseModel):
    vehicle_number: str


class CheckInResponse(BaseModel):
    vehicle_number: str
    assigned_slot: str
    assigned_label: str
    algorithm: str
    path: List[str]
    entered_at: datetime


class CheckOutResponse(BaseModel):
    vehicle_number: str
    slot_released: str
    entered_at: datetime
    exited_at: datetime
