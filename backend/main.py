from datetime import datetime
from pathlib import Path
from random import randint, sample
from typing import Dict, List, Set, Tuple

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from algorithms.search import a_star_search, best_first_search
from models import (
    AuthResponse,
    Base,
    CheckInRequest,
    CheckInResponse,
    CheckOutRequest,
    CheckOutResponse,
    FindSlotRequest,
    LoginRequest,
    ParkingDataResponse,
    ParkingSessionORM,
    ParkingSlot,
    ParkingSlotORM,
    RouteResponse,
    SimulateUpdateResponse,
    UserCreateRequest,
    UserORM,
    UserResponse,
    VehicleCreateRequest,
    VehicleORM,
    VehicleResponse,
)

BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = f"sqlite:///{BASE_DIR / 'parking.db'}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

GRID_ROWS = 8
GRID_COLS = 8


app = FastAPI(
    title="AI Smart Parking Finder",
    version="2.0.0",
    description="Full-stack smart parking backend with A* and Best First Search",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db() -> Session:
    return SessionLocal()


def make_node_id(row: int, col: int) -> str:
    return f"N{row:02d}{col:02d}"


def make_slot_label(row: int, col: int) -> str:
    return f"P-{row + 1}{chr(65 + col)}"


def seed_database(db: Session) -> None:
    existing = db.query(ParkingSlotORM).count()
    if existing == 0:
        slots: List[ParkingSlotORM] = []
        for r in range(GRID_ROWS):
            for c in range(GRID_COLS):
                status = "occupied" if randint(0, 100) < 35 else "available"
                slots.append(
                    ParkingSlotORM(
                        node_id=make_node_id(r, c),
                        label=make_slot_label(r, c),
                        row=r,
                        col=c,
                        status=status,
                        x=float(c),
                        y=float(r),
                    )
                )
        db.add_all(slots)

    if db.query(UserORM).count() == 0:
        db.add_all(
            [
                UserORM(username="admin", password="admin123"),
                UserORM(username="operator", password="operator123"),
                UserORM(username="attendant", password="attendant123"),
            ]
        )

    if db.query(VehicleORM).count() == 0:
        db.add_all(
            [
                VehicleORM(vehicle_number="KA01AB1234", owner_name="Demo User", vehicle_type="standard"),
                VehicleORM(vehicle_number="KA09EV9090", owner_name="EV Owner", vehicle_type="ev"),
                VehicleORM(vehicle_number="KA05SU7777", owner_name="SUV Owner", vehicle_type="large"),
            ]
        )

    db.commit()


def normalize_vehicle_type(vehicle_type: str | None) -> str:
    if not vehicle_type:
        return "standard"
    vt = vehicle_type.strip().lower()
    if vt in {"compact", "small"}:
        return "compact"
    if vt in {"large", "suv"}:
        return "large"
    if vt in {"ev", "electric"}:
        return "ev"
    if vt in {"bike", "motorbike", "two-wheeler"}:
        return "bike"
    return "standard"


def is_slot_compatible(slot: ParkingSlotORM, vehicle_type: str) -> bool:
    vt = normalize_vehicle_type(vehicle_type)
    if vt == "ev":
        return slot.row == 0
    if vt == "large":
        return slot.col >= 6
    if vt == "compact":
        return slot.col <= 2
    if vt == "bike":
        return slot.col <= 1
    return True


def build_graph(rows: int, cols: int) -> Dict[str, List[str]]:
    graph: Dict[str, List[str]] = {}
    for r in range(rows):
        for c in range(cols):
            node = make_node_id(r, c)
            neighbors: List[str] = []
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nr = r + dr
                nc = c + dc
                if 0 <= nr < rows and 0 <= nc < cols:
                    neighbors.append(make_node_id(nr, nc))
            graph[node] = neighbors
    return graph


def coords_map(rows: int, cols: int) -> Dict[str, Tuple[int, int]]:
    return {make_node_id(r, c): (r, c) for r in range(rows) for c in range(cols)}


def compute_best_route(
    start: str,
    algorithm: str,
    slots: List[ParkingSlotORM],
    vehicle_type: str = "standard",
) -> Tuple[ParkingSlotORM, List[str]]:
    graph = build_graph(GRID_ROWS, GRID_COLS)
    coords = coords_map(GRID_ROWS, GRID_COLS)

    if start not in graph:
        raise HTTPException(status_code=400, detail="Invalid start node")

    available_slots = [
        s for s in slots if s.status == "available" and is_slot_compatible(s, vehicle_type)
    ]
    if not available_slots:
        raise HTTPException(status_code=404, detail="No compatible available parking slot")

    blocked: Set[str] = set()

    selected_slot: ParkingSlotORM | None = None
    selected_path: List[str] | None = None

    for candidate in available_slots:
        search_blocked = set(blocked)
        search_blocked.discard(candidate.node_id)

        if algorithm == "best_first":
            path = best_first_search(graph, coords, start, candidate.node_id, search_blocked)
        else:
            path = a_star_search(graph, coords, start, candidate.node_id, search_blocked)

        if not path:
            continue

        if selected_path is None or len(path) < len(selected_path):
            selected_path = path
            selected_slot = candidate

    if selected_slot is None or selected_path is None:
        raise HTTPException(status_code=404, detail="No route could be found")

    return selected_slot, selected_path


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


@app.get("/")
def root() -> dict:
    return {
        "message": "AI Smart Parking Finder API",
        "version": "2.0.0",
        "algorithms": ["astar", "best_first"],
    }


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/parking", response_model=ParkingDataResponse)
def get_parking_data(db: Session = Depends(get_db)) -> ParkingDataResponse:
    slots = db.query(ParkingSlotORM).order_by(ParkingSlotORM.row, ParkingSlotORM.col).all()

    active_sessions = (
        db.query(ParkingSessionORM.slot_node_id, VehicleORM.vehicle_type, VehicleORM.vehicle_number)
        .join(VehicleORM, ParkingSessionORM.vehicle_id == VehicleORM.id)
        .filter(ParkingSessionORM.exited_at.is_(None))
        .all()
    )
    active_by_slot = {
        record.slot_node_id: {
            "vehicle_type": record.vehicle_type,
            "vehicle_number": record.vehicle_number,
        }
        for record in active_sessions
    }

    total = len(slots)
    available = sum(1 for s in slots if s.status == "available")
    occupied = total - available

    return ParkingDataResponse(
        rows=GRID_ROWS,
        cols=GRID_COLS,
        total_slots=total,
        available_slots=available,
        occupied_slots=occupied,
        slots=[
            ParkingSlot(
                node_id=s.node_id,
                label=s.label,
                row=s.row,
                col=s.col,
                status=s.status,
                vehicle_type=active_by_slot.get(s.node_id, {}).get("vehicle_type"),
                vehicle_number=active_by_slot.get(s.node_id, {}).get("vehicle_number"),
            )
            for s in slots
        ],
        server_time=datetime.utcnow(),
    )


@app.post("/api/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.query(UserORM).filter(UserORM.username == payload.username).first()
    if not user or user.password != payload.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = f"token-{user.username}-{int(datetime.utcnow().timestamp())}"
    return AuthResponse(token=token, username=user.username)


@app.post("/api/users", response_model=UserResponse)
def create_user(payload: UserCreateRequest, db: Session = Depends(get_db)) -> UserResponse:
    username = payload.username.strip().lower()
    if not username:
        raise HTTPException(status_code=400, detail="username is required")

    existing = db.query(UserORM).filter(UserORM.username == username).first()
    if existing:
        raise HTTPException(status_code=409, detail="User already exists")

    user = UserORM(username=username, password=payload.password)
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserResponse(username=user.username, created_at=user.created_at)


@app.get("/api/users", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db)) -> List[UserResponse]:
    users = db.query(UserORM).order_by(UserORM.created_at.desc()).all()
    return [UserResponse(username=u.username, created_at=u.created_at) for u in users]


@app.post("/api/parking/simulate", response_model=SimulateUpdateResponse)
def simulate_realtime_update(db: Session = Depends(get_db)) -> SimulateUpdateResponse:
    slots = db.query(ParkingSlotORM).all()
    if not slots:
        raise HTTPException(status_code=404, detail="No parking data found")

    changes = max(1, len(slots) // 10)
    selected = sample(slots, k=changes)

    for slot in selected:
        slot.status = "available" if slot.status == "occupied" else "occupied"
        slot.updated_at = datetime.utcnow()

    db.commit()

    return SimulateUpdateResponse(changed_slots=changes, server_time=datetime.utcnow())


@app.post("/api/find-slot", response_model=RouteResponse)
def find_optimal_slot(payload: FindSlotRequest, db: Session = Depends(get_db)) -> RouteResponse:
    slots = db.query(ParkingSlotORM).all()
    algo = payload.algorithm.lower().strip()
    if algo not in {"astar", "best_first"}:
        raise HTTPException(status_code=400, detail="algorithm must be 'astar' or 'best_first'")

    vehicle_type = payload.vehicle_type
    if payload.vehicle_number and not vehicle_type:
        vehicle = (
            db.query(VehicleORM)
            .filter(VehicleORM.vehicle_number == payload.vehicle_number.upper().strip())
            .first()
        )
        if vehicle:
            vehicle_type = vehicle.vehicle_type

    target, path = compute_best_route(payload.current_node, algo, slots, normalize_vehicle_type(vehicle_type))
    distance = len(path) - 1
    estimated_minutes = round(distance * 0.55, 2)

    return RouteResponse(
        algorithm=algo,
        target_node=target.node_id,
        target_label=target.label,
        path=path,
        distance=distance,
        estimated_minutes=estimated_minutes,
    )


@app.get("/api/route", response_model=RouteResponse)
def route_to_slot(
    start: str = Query(..., alias="start_node"),
    goal: str = Query(..., alias="goal_node"),
    algorithm: str = Query("astar"),
    db: Session = Depends(get_db),
) -> RouteResponse:
    slots = db.query(ParkingSlotORM).all()
    graph = build_graph(GRID_ROWS, GRID_COLS)
    coords = coords_map(GRID_ROWS, GRID_COLS)

    if start not in graph or goal not in graph:
        raise HTTPException(status_code=400, detail="Invalid start/goal node")

    blocked: Set[str] = set()

    algo = algorithm.lower().strip()
    if algo == "best_first":
        path = best_first_search(graph, coords, start, goal, blocked)
    else:
        path = a_star_search(graph, coords, start, goal, blocked)

    if not path:
        raise HTTPException(status_code=404, detail="No route found")

    goal_slot = next((s for s in slots if s.node_id == goal), None)
    label = goal_slot.label if goal_slot else goal

    return RouteResponse(
        algorithm=algo,
        target_node=goal,
        target_label=label,
        path=path,
        distance=len(path) - 1,
        estimated_minutes=round((len(path) - 1) * 0.55, 2),
    )


@app.post("/api/vehicles", response_model=VehicleResponse)
def create_vehicle(payload: VehicleCreateRequest, db: Session = Depends(get_db)) -> VehicleResponse:
    number = payload.vehicle_number.upper().strip()
    existing = db.query(VehicleORM).filter(VehicleORM.vehicle_number == number).first()
    if existing:
        raise HTTPException(status_code=409, detail="Vehicle already exists")

    vehicle = VehicleORM(
        vehicle_number=number,
        owner_name=payload.owner_name.strip(),
        vehicle_type=normalize_vehicle_type(payload.vehicle_type),
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    return VehicleResponse(
        vehicle_number=vehicle.vehicle_number,
        owner_name=vehicle.owner_name,
        vehicle_type=vehicle.vehicle_type,
        created_at=vehicle.created_at,
    )


@app.get("/api/vehicles", response_model=List[VehicleResponse])
def list_vehicles(db: Session = Depends(get_db)) -> List[VehicleResponse]:
    vehicles = db.query(VehicleORM).order_by(VehicleORM.created_at.desc()).all()
    return [
        VehicleResponse(
            vehicle_number=v.vehicle_number,
            owner_name=v.owner_name,
            vehicle_type=v.vehicle_type,
            created_at=v.created_at,
        )
        for v in vehicles
    ]


@app.post("/api/check-in", response_model=CheckInResponse)
def check_in_vehicle(payload: CheckInRequest, db: Session = Depends(get_db)) -> CheckInResponse:
    number = payload.vehicle_number.upper().strip()
    vehicle = db.query(VehicleORM).filter(VehicleORM.vehicle_number == number).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    active = (
        db.query(ParkingSessionORM)
        .filter(ParkingSessionORM.vehicle_id == vehicle.id, ParkingSessionORM.exited_at.is_(None))
        .first()
    )
    if active:
        raise HTTPException(status_code=409, detail="Vehicle already checked in")

    algo = payload.algorithm.lower().strip()
    if algo not in {"astar", "best_first"}:
        raise HTTPException(status_code=400, detail="algorithm must be 'astar' or 'best_first'")

    slots = db.query(ParkingSlotORM).all()
    target, path = compute_best_route(payload.current_node, algo, slots, vehicle.vehicle_type)

    target.status = "occupied"
    target.updated_at = datetime.utcnow()

    session = ParkingSessionORM(
        vehicle_id=vehicle.id,
        slot_node_id=target.node_id,
        algorithm=algo,
        entered_at=datetime.utcnow(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return CheckInResponse(
        vehicle_number=vehicle.vehicle_number,
        assigned_slot=target.node_id,
        assigned_label=target.label,
        algorithm=algo,
        path=path,
        entered_at=session.entered_at,
    )


@app.post("/api/check-out", response_model=CheckOutResponse)
def check_out_vehicle(payload: CheckOutRequest, db: Session = Depends(get_db)) -> CheckOutResponse:
    number = payload.vehicle_number.upper().strip()
    vehicle = db.query(VehicleORM).filter(VehicleORM.vehicle_number == number).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    active = (
        db.query(ParkingSessionORM)
        .filter(ParkingSessionORM.vehicle_id == vehicle.id, ParkingSessionORM.exited_at.is_(None))
        .first()
    )
    if not active:
        raise HTTPException(status_code=404, detail="No active parking session found")

    slot = db.query(ParkingSlotORM).filter(ParkingSlotORM.node_id == active.slot_node_id).first()
    if slot:
        slot.status = "available"
        slot.updated_at = datetime.utcnow()

    active.exited_at = datetime.utcnow()
    db.commit()

    return CheckOutResponse(
        vehicle_number=vehicle.vehicle_number,
        slot_released=active.slot_node_id,
        entered_at=active.entered_at,
        exited_at=active.exited_at,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
