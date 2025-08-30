
# Warehouse Management Backend

## Setup

1. Install PostgreSQL
2. Create database: `warehouse_db`
3. Update DATABASE_URL in .env file
4. Install dependencies: `pip install -r requirements.txt`
5. Run server: `python main.py`

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
