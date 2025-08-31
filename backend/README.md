
# Warehouse Management Backend

## Setup

1. Install PostgreSQL and create the `clinic_bot` database.
2. Optionally create a `.env` file with `DATABASE_URL` if you don't want the default
   `postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/clinic_bot`.
3. Install Python dependencies: `pip install -r requirements.txt`.
4. Start the API with Uvicorn:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Quick start on Windows (PowerShell)

```powershell
cd backend
python -m venv .venv
\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# set DB url if needed (or create .env with DATABASE_URL=...)
# $env:DATABASE_URL="postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/clinic_bot"

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# Then login from frontend with: admin / admin
```

## API Endpoints

- POST /auth/login - Login
- GET/POST /branches - Branches management
- GET/POST/PUT/DELETE /medicines - Medicines management
- GET/POST /employees - Employees management
- GET/POST /patients - Patients management
- GET/POST /transfers - Medicine transfers
- GET/POST /dispensings - Medicine dispensing
- GET/POST /arrivals - Medicine arrivals

Server runs on http://localhost:8000
API docs available at http://localhost:8000/docs
