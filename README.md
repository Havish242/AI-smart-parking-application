AI Smart Parking Application

A full-stack parking management system with intelligent slot assignment and route optimization.

## What this project does

- Manages an 8x8 parking grid with real-time occupancy updates
- Finds optimal parking slots using A* or Best-First Search
- Supports vehicle check-in and check-out flows
- Provides a React + Vite dashboard for operators
- Stores data in SQLite through SQLAlchemy ORM

## Tech stack

Backend:
- FastAPI
- SQLAlchemy
- SQLite
- Pydantic

Frontend:
- React 18
- Vite 5
- Tailwind CSS
- Framer Motion

## Project structure

- backend: FastAPI app, models, algorithms, and business logic
- frontend: React client app
- QUICK_START.md: quick local run steps
- PROJECT_COMPLETE.md: project summary notes

## Local setup

Prerequisites:
- Python 3.10+
- Node.js 18+

### 1) Backend setup

From the project root:

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Backend runs on:
- http://localhost:8000
- Swagger docs: http://localhost:8000/docs

### 2) Frontend setup

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:
- http://localhost:5173

## Seeded login users

The backend seeds demo users on first run:

- admin / admin123
- operator / operator123
- attendant / attendant123

## Main API endpoints

Health and data:
- GET /api/health
- GET /api/parking
- POST /api/parking/simulate

Auth and users:
- POST /api/auth/login
- POST /api/users
- GET /api/users

Routing and slot finding:
- POST /api/find-slot
- GET /api/route?start_node=N0000&goal_node=N0001&algorithm=astar

Vehicles and sessions:
- POST /api/vehicles
- GET /api/vehicles
- POST /api/check-in
- POST /api/check-out

Root endpoint:
- GET /

## Example requests

Find best slot:

```bash
curl -X POST http://localhost:8000/api/find-slot \
  -H "Content-Type: application/json" \
  -d '{
    "current_node": "N0000",
    "algorithm": "astar",
    "vehicle_type": "standard"
  }'
```

Check-in vehicle:

```bash
curl -X POST http://localhost:8000/api/check-in \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_number": "KA01AB1234",
    "current_node": "N0000",
    "algorithm": "astar"
  }'
```

Check-out vehicle:

```bash
curl -X POST http://localhost:8000/api/check-out \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_number": "KA01AB1234"
  }'
```

## Notes

- Database file is created at backend/parking.db
- Slot compatibility rules are based on vehicle type
- Route algorithm must be astar or best_first

## Deployment

This repository includes vercel.json and can be adapted for deployment.
For production, set strict CORS origins and move secrets/config to environment variables.

## License

Add your preferred license information here.
