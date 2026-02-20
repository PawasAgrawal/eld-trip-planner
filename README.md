# ELD Trip Planner
A full-stack web application designed to compute HOS-compliant schedules for commercial truck drivers.

## What is ELD?
Electronic Logging Devices (ELD) are used by commercial motor vehicle drivers to automatically record their driving time and Hours of Service (HOS). HOS rules mandate the maximum number of hours a truck driver can be on duty, how long they can drive, and the minimum rest periods required. These rules are designed to prevent accidents caused by driver fatigue.

## Features
- **Route planning with map**: Interactive map visualization of the computed route between stops.
- **HOS-compliant schedule generation**: Automatically inserts required breaks and rests into the trip schedule according to FMCSA rules.
- **ELD daily log sheet drawing**: Visually plots the typical ELD log graph (Off Duty, Sleeper Berth, Driving, On Duty) for each trip day.
- **Fuel/rest/break stop calculation**: Determines necessary stops for fueling and regulatory breaks/rests.
- **Multi-day trip support**: Splits longer trips predictably across multiple days with corresponding daily ELD logs.

## Tech Stack
| Backend | Frontend |
|---------|----------|
| Django 4.2+ | React 18 |
| Django REST Framework | Vite 6 |
| OSRM API | Leaflet.js + react-leaflet |
| Nominatim/OpenStreetMap | Axios |
| Gunicorn | HTML Canvas |
| Whitenoise | Tailwind CSS |

## HOS Rules Implemented
| Rule | Value |
|------|-------|
| Max Driving | 11 hrs/day |
| On-Duty Window | 14 hrs |
| Mandatory Rest | 10 hrs |
| Break Requirement | 30 min after 8 hrs driving |
| Cycle Limit | 70 hrs / 8 days |
| Fuel Stops | every 1,000 miles |
| Pickup/Dropoff | 1 hr each |

## Project Structure
```text
backend/
├── manage.py           # Django management script
├── requirements.txt    # Python dependencies
├── Procfile            # Render.com deployment configuration
├── core/               # Django project settings
│   ├── settings.py     # Main configuration, CORS, Database settings
│   └── urls.py         # Root URL routing
└── trip/               # Trip planning application
    ├── routing.py      # Geocoding and route polyline fetching logic
    ├── hos_calculator.py # Core business logic for HOS rules
    ├── views.py        # API endpoint controllers
    └── urls.py         # App-specific URL routing

eld-trip-planner-react/
├── index.html          # Main HTML entry point
├── package.json        # Node.js dependencies and scripts
├── vite.config.ts      # Vite bundler configuration
└── src/                # React source code components and logic
```

## Local Development

### Clone the repo
```bash
git clone <repository-url>
cd ELD-TRIP-PLANNER-MAIN
```

### Set up and run the Django backend
```bash
cd backend
python -m venv venv
# On Windows: venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```
Backend will be available at `http://127.0.0.1:8000/`.

### Set up and run the React frontend
```bash
cd ../eld-trip-planner-react
npm install
# Create .env.local
echo VITE_API_URL=http://127.0.0.1:8000/api > .env.local
npm run dev
```
Frontend will be available at `http://localhost:5173/`.

## API Reference
**Endpoint:** `POST /api/trip/plan/`

**Request Body Schema:**
```json
{
  "current_location": "string",
  "pickup_location": "string",
  "dropoff_location": "string",
  "current_cycle_used": "number (0-70)"
}
```

**Example cURL:**
```bash
curl -X POST http://127.0.0.1:8000/api/trip/plan/ \
  -H "Content-Type: application/json" \
  -d '{"current_location":"Chicago, IL","pickup_location":"St. Louis, MO","dropoff_location":"Dallas, TX","current_cycle_used":22}'
```

**Response Fields:**
- `locations`: Object containing the geocoded features for `current`, `pickup`, and `dropoff`. Each has `lat`, `lon`, and `display_name`.
- `routes`: Object containing `leg1` and `leg2`. Each holds `distance_miles`, `duration_hours`, and `geometry`.
- `total_distance_miles`: Total distance of the trip.
- `total_driving_hours`: Total accumulated driving time.
- `total_rest_hours`: Total resting time.
- `total_days`: Number of days the trip spans.
- `events`: Array of all timeline events.
- `daily_logs`: Array of generated logs grouped by date.

## Deployment

### Backend → Render.com
- **Build Command:** `pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput`
- **Start Command:** `gunicorn core.wsgi:application --bind 0.0.0.0:$PORT`
- **Required Env Vars:** `DJANGO_SECRET_KEY`, `DEBUG=False`

### Frontend → Vercel
- **Env Var:** Set `VITE_API_URL` to your Render backend URL (e.g., `https://your-backend.onrender.com/api`).
- **Config:** Standard Vite SPA config.

*Note: After deploying both, update CORS_ALLOW_ALL_ORIGINS or CORS_ALLOWED_ORIGINS in settings.py to the Vercel domain and redeploy the backend if necessary.*

## Environment Variables

| Variable | Service | Description | Example Value |
|----------|---------|-------------|---------------|
| `DJANGO_SECRET_KEY` | Backend | Secret signing key for Django | `your-secret-key-here` |
| `DEBUG` | Backend | Enable/disable debug mode | `False` |
| `VITE_API_URL` | Frontend | Base API URL | `http://127.0.0.1:8000/api` |

## License
MIT
