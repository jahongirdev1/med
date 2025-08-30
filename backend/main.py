from fastapi import FastAPI, Depends, HTTPException, status, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import inspect, select, update, MetaData, Table
from sqlalchemy.sql import text
from database import (
    get_db,
    create_tables,
    engine,
    SessionLocal,
    User as DBUser,
    Branch as DBBranch,
    Medicine as DBMedicine,
    Employee as DBEmployee,
    Patient as DBPatient,
    Transfer as DBTransfer,
    DispensingRecord as DBDispensingRecord,
    DispensingItem as DBDispensingItem,
    Arrival as DBArrival,
    DeviceArrival as DBDeviceArrival,
    Category as DBCategory,
    MedicalDevice as DBMedicalDevice,
    Shipment as DBShipment,
    ShipmentItem as DBShipmentItem,
    Notification as DBNotification,
)
from schemas import *
import schemas
from typing import List, Optional
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
import uuid
import json
import os


pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
JWT_ALG = os.getenv("JWT_ALG", "HS256")
JWT_EXP_MIN = int(os.getenv("JWT_EXP_MIN", "720"))

auth = APIRouter(prefix="/auth", tags=["auth"])


def ensure_schema_patches():
    """Apply idempotent schema changes and ensure data consistency."""
    with engine.begin() as conn:
        insp = inspect(conn)

        # --- 1) DDL: columns / constraints ---

        # 1a) medicines.category_id column
        med_cols = [c["name"] for c in insp.get_columns("medicines")]
        if "category_id" not in med_cols:
            conn.exec_driver_sql("ALTER TABLE public.medicines ADD COLUMN category_id varchar")

        # 1b) Medicines FK -> categories(id) (drop old, then create)
        conn.exec_driver_sql(
            """
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_medicines_category') THEN
            ALTER TABLE public.medicines DROP CONSTRAINT fk_medicines_category;
          END IF;
        END $$;
        """
        )
        conn.exec_driver_sql(
            """
        ALTER TABLE public.medicines
          ADD CONSTRAINT fk_medicines_category
          FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
        """
        )

        # 1c) Medical devices FK -> categories(id) (drop legacy FK if any)
        conn.exec_driver_sql(
            """
        ALTER TABLE public.medical_devices
          DROP CONSTRAINT IF EXISTS medical_devices_category_id_fkey;
        """
        )
        conn.exec_driver_sql(
            """
        ALTER TABLE public.medical_devices
          DROP CONSTRAINT IF EXISTS fk_medical_devices_category;
        """
        )
        conn.exec_driver_sql(
            """
        ALTER TABLE public.medical_devices
          ADD CONSTRAINT fk_medical_devices_category
          FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;
        """
        )

        # device_arrivals table
        conn.exec_driver_sql(
            """
            CREATE TABLE IF NOT EXISTS public.device_arrivals (
              id varchar PRIMARY KEY,
              device_id varchar NOT NULL,
              device_name varchar NOT NULL,
              quantity integer NOT NULL,
              purchase_price double precision NOT NULL,
              sell_price double precision NOT NULL,
              date timestamp without time zone DEFAULT NOW()
            )
            """
        )

        # shipments.accepted_at column
        ship_cols = [c["name"] for c in insp.get_columns("shipments")]
        if "accepted_at" not in ship_cols:
            conn.exec_driver_sql(
                "ALTER TABLE public.shipments ADD COLUMN accepted_at timestamp"
            )

        # helpful indexes
        conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories(type);")
        conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_med_category_id ON public.medicines(category_id);")
        conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS idx_dev_category_id ON public.medical_devices(category_id);")

        # ensure medical_devices.sell_price has default 0
        dev_cols_info = insp.get_columns("medical_devices")
        sell_col = next((c for c in dev_cols_info if c["name"] == "sell_price"), None)
        if sell_col and sell_col.get("default") is None:
            conn.exec_driver_sql(
                "ALTER TABLE public.medical_devices ALTER COLUMN sell_price SET DEFAULT 0"
            )

        # --- 2) DML: backfill using SQLAlchemy Core (no raw placeholders) ---

        md = MetaData()
        categories = Table("categories", md, autoload_with=engine)
        medicines = Table("medicines", md, autoload_with=engine)
        devices = Table("medical_devices", md, autoload_with=engine)

        # 2a) pick a default category for medicines
        default_med_cat_id = conn.execute(
            select(categories.c.id)
            .where(categories.c.type == "medicine")
            .order_by(categories.c.name)
            .limit(1)
        ).scalar_one_or_none()

        if default_med_cat_id is not None and "category_id" in med_cols:
            conn.execute(
                update(medicines)
                .where(medicines.c.category_id.is_(None))
                .values(category_id=default_med_cat_id)
            )

        # 2b) backfill medical_devices.category_id if needed
        default_dev_cat_id = conn.execute(
            select(categories.c.id)
            .where(categories.c.type == "medical_device")
            .order_by(categories.c.name)
            .limit(1)
        ).scalar_one_or_none()

        dev_cols = [c["name"] for c in insp.get_columns("medical_devices")]
        if default_dev_cat_id is not None and "category_id" in dev_cols:
            conn.execute(
                update(devices)
                .where(devices.c.category_id.is_(None))
                .values(category_id=default_dev_cat_id)
            )


# default data helpers


def ensure_default_categories(db: Session):
    medicine_category = db.query(DBCategory).filter(DBCategory.name == "Общие лекарства").one_or_none()
    if not medicine_category:
        db.add(
            DBCategory(
                id=str(uuid.uuid4()),
                name="Общие лекарства",
                description="Общая категория лекарств",
                type="medicine",
            )
        )

    device_category = db.query(DBCategory).filter(DBCategory.name == "Общие ИМН").one_or_none()
    if not device_category:
        db.add(
            DBCategory(
                id=str(uuid.uuid4()),
                name="Общие ИМН",
                description="Общая категория изделий медицинского назначения",
                type="medical_device",
            )
        )


def seed_defaults(db: Session):
    admin_login = os.getenv("ADMIN_LOGIN", "admin")
    admin_password = os.getenv("ADMIN_PASSWORD", "adm1n")
    admin = db.query(DBUser).filter(DBUser.login == admin_login).one_or_none()
    if not admin:
        admin_kwargs = {
            "id": str(uuid.uuid4()),
            "login": admin_login,
            "role": "admin",
        }
        if hasattr(DBUser, "is_active"):
            admin_kwargs["is_active"] = True
        if hasattr(DBUser, "branch_id"):
            admin_kwargs["branch_id"] = None
        password_hash = pwd.hash(admin_password)
        if hasattr(DBUser, "password_hash"):
            admin_kwargs["password_hash"] = password_hash
        else:
            admin_kwargs["password"] = password_hash
        db.add(DBUser(**admin_kwargs))

    ensure_default_categories(db)
    db.commit()


# Auth endpoints
@auth.post("/login", response_model=schemas.LoginOut)
def login(payload: schemas.LoginIn, db: Session = Depends(get_db)):
    try:
        user = db.query(DBUser).filter(DBUser.login == payload.login).one_or_none()
        if not user or (hasattr(user, "is_active") and not user.is_active):
            raise HTTPException(401, "Invalid login or inactive user")

        password_hash = getattr(user, "password_hash", None) or getattr(user, "password", "")
        if not pwd.verify(payload.password, password_hash):
            raise HTTPException(401, "Invalid login or password")

        exp = datetime.utcnow() + timedelta(minutes=JWT_EXP_MIN)
        token = jwt.encode({"sub": user.id, "exp": exp}, JWT_SECRET, algorithm=JWT_ALG)

        return {
            "access_token": token,
            "user": {
                "id": user.id,
                "login": user.login,
                "role": user.role,
                "branch_id": getattr(user, "branch_id", None),
            },
        }
    except HTTPException:
        raise
    except Exception:
        import logging, traceback

        logging.exception("Login error")
        raise HTTPException(500, "Internal auth error")


# Create FastAPI app
app = FastAPI(title="Warehouse Management System")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# logging middleware and auxiliary endpoints are defined below

@app.middleware("http")
async def log_requests(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception:
        import logging, traceback

        logging.exception("Unhandled error on %s %s", request.method, request.url.path)
        raise


app.include_router(auth)


@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"ok": True}


@app.on_event("startup")
def on_startup():
    create_tables()
    ensure_schema_patches()
    db = SessionLocal()
    try:
        seed_defaults(db)
    finally:
        db.close()

# User endpoints
@app.get("/users", response_model=List[User])
async def get_users(db: Session = Depends(get_db)):
    db_users = db.query(DBUser).all()
    return [User.model_validate(user) for user in db_users]

@app.post("/users", response_model=User)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(DBUser).filter(DBUser.login == user.login).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this login already exists")
    
    user_id = str(uuid.uuid4())
    db_user = DBUser(
        id=user_id,
        login=user.login,
        password=user.password,
        role=user.role,
        branch_name=user.branch_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return User.model_validate(db_user)

@app.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user: UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    for field, value in user.model_dump(exclude_unset=True).items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return User.model_validate(db_user)

@app.delete("/users/{user_id}")
async def delete_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}

# Branch endpoints
@app.get("/branches", response_model=List[Branch])
async def get_branches(db: Session = Depends(get_db)):
    db_branches = db.query(DBBranch).all()
    return [Branch.model_validate(branch) for branch in db_branches]

@app.post("/branches", response_model=Branch)
async def create_branch(branch: BranchCreate, db: Session = Depends(get_db)):
    branch_id = str(uuid.uuid4())
    db_branch = DBBranch(
        id=branch_id,
        name=branch.name,
        login=branch.login,
        password=branch.password
    )
    db.add(db_branch)
    
    # Also create user for branch
    db_user = DBUser(
        id=branch_id,
        login=branch.login,
        password=branch.password,
        role="branch",
        branch_name=branch.name
    )
    db.add(db_user)
    
    db.commit()
    db.refresh(db_branch)
    return Branch.model_validate(db_branch)

@app.put("/branches/{branch_id}", response_model=Branch)
async def update_branch(branch_id: str, branch: BranchUpdate, db: Session = Depends(get_db)):
    db_branch = db.query(DBBranch).filter(DBBranch.id == branch_id).first()
    if not db_branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    for field, value in branch.model_dump(exclude_unset=True).items():
        setattr(db_branch, field, value)
    
    # Update corresponding user
    db_user = db.query(DBUser).filter(DBUser.id == branch_id).first()
    if db_user:
        if branch.login:
            db_user.login = branch.login
        if branch.password:
            db_user.password = branch.password
        if branch.name:
            db_user.branch_name = branch.name
    
    db.commit()
    db.refresh(db_branch)
    return Branch.model_validate(db_branch)

@app.delete("/branches/{branch_id}")
async def delete_branch(branch_id: str, db: Session = Depends(get_db)):
    branch = db.query(DBBranch).filter(DBBranch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    # Delete corresponding user
    user = db.query(DBUser).filter(DBUser.id == branch_id).first()
    if user:
        db.delete(user)
    
    db.delete(branch)
    db.commit()
    return {"message": "Branch deleted"}

# Medicine endpoints
@app.get("/medicines", response_model=List[Medicine])
async def get_medicines(branch_id: Optional[str] = None, db: Session = Depends(get_db)):
    if branch_id and branch_id != "null" and branch_id != "undefined":
        db_medicines = db.query(DBMedicine).filter(DBMedicine.branch_id == branch_id).all()
    else:
        db_medicines = db.query(DBMedicine).filter(DBMedicine.branch_id.is_(None)).all()
    return [Medicine.model_validate(medicine) for medicine in db_medicines]

@app.post("/medicines", response_model=Medicine)
async def create_medicine(medicine: MedicineCreate, db: Session = Depends(get_db)):
    cat = db.query(DBCategory).filter(DBCategory.id == medicine.category_id).first()
    if not cat:
        raise HTTPException(status_code=400, detail="Category not found")
    if cat.type != "medicine":
        raise HTTPException(status_code=400, detail="Invalid category for medicine")

    medicine_id = str(uuid.uuid4())
    db_medicine = DBMedicine(
        id=medicine_id,
        name=medicine.name,
        category_id=medicine.category_id,
        purchase_price=medicine.purchase_price,
        sell_price=medicine.sell_price,
        quantity=medicine.quantity,
        branch_id=medicine.branch_id,
    )
    db.add(db_medicine)
    db.commit()
    db.refresh(db_medicine)
    return Medicine.model_validate(db_medicine)

@app.put("/medicines/{medicine_id}", response_model=Medicine)
async def update_medicine(medicine_id: str, medicine: MedicineUpdate, db: Session = Depends(get_db)):
    db_medicine = db.query(DBMedicine).filter(DBMedicine.id == medicine_id).first()
    if not db_medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    category_id = medicine.category_id if medicine.category_id is not None else db_medicine.category_id
    cat = db.query(DBCategory).filter(DBCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=400, detail="Category not found")
    if cat.type != "medicine":
        raise HTTPException(status_code=400, detail="Invalid category for medicine")
    
    for field, value in medicine.model_dump(exclude_unset=True).items():
        setattr(db_medicine, field, value)

    db.commit()
    db.refresh(db_medicine)
    return Medicine.model_validate(db_medicine)

@app.delete("/medicines/{medicine_id}")
async def delete_medicine(medicine_id: str, db: Session = Depends(get_db)):
    medicine = db.query(DBMedicine).filter(DBMedicine.id == medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    db.delete(medicine)
    db.commit()
    return {"message": "Medicine deleted"}

# Medical Device endpoints
@app.get("/medical_devices", response_model=List[MedicalDevice])
async def get_medical_devices(branch_id: Optional[str] = None, db: Session = Depends(get_db)):
    if branch_id and branch_id != "null" and branch_id != "undefined":
        db_devices = db.query(DBMedicalDevice).filter(DBMedicalDevice.branch_id == branch_id).all()
    else:
        db_devices = db.query(DBMedicalDevice).filter(DBMedicalDevice.branch_id.is_(None)).all()
    return [MedicalDevice.model_validate(device) for device in db_devices]

@app.post("/medical_devices", response_model=MedicalDevice)
async def create_medical_device(device: MedicalDeviceCreate, db: Session = Depends(get_db)):
    cat = db.query(DBCategory).filter(DBCategory.id == device.category_id).first()
    if not cat:
        raise HTTPException(status_code=400, detail="Category not found")
    if cat.type != "medical_device":
        raise HTTPException(status_code=400, detail="Invalid category for medical device")

    device_id = str(uuid.uuid4())
    sell_price = device.sell_price if device.sell_price is not None else 0
    db_device = DBMedicalDevice(
        id=device_id,
        name=device.name,
        category_id=device.category_id,
        purchase_price=device.purchase_price,
        sell_price=sell_price,
        quantity=device.quantity,
        branch_id=device.branch_id,
    )
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return MedicalDevice.model_validate(db_device)

@app.put("/medical_devices/{device_id}", response_model=MedicalDevice)
async def update_medical_device(device_id: str, device: MedicalDeviceUpdate, db: Session = Depends(get_db)):
    db_device = db.query(DBMedicalDevice).filter(DBMedicalDevice.id == device_id).first()
    if not db_device:
        raise HTTPException(status_code=404, detail="Medical device not found")

    category_id = device.category_id if device.category_id is not None else db_device.category_id
    cat = db.query(DBCategory).filter(DBCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=400, detail="Category not found")
    if cat.type != "medical_device":
        raise HTTPException(status_code=400, detail="Invalid category for medical device")

    for field, value in device.model_dump(exclude_unset=True).items():
        if field == "sell_price" and value is None:
            continue
        setattr(db_device, field, value)

    db.commit()
    db.refresh(db_device)
    return MedicalDevice.model_validate(db_device)

@app.delete("/medical_devices/{device_id}")
async def delete_medical_device(device_id: str, db: Session = Depends(get_db)):
    device = db.query(DBMedicalDevice).filter(DBMedicalDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Medical device not found")
    
    db.delete(device)
    db.commit()
    return {"message": "Medical device deleted"}

# Category endpoints
@app.get("/categories", response_model=List[dict])
async def get_categories(type: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(DBCategory)
    if type:
        query = query.filter(DBCategory.type == type)
    categories = query.all()
    return [{"id": cat.id, "name": cat.name, "description": cat.description, "type": cat.type} for cat in categories]

@app.post("/categories")
async def create_category(category: dict, db: Session = Depends(get_db)):
    category_id = str(uuid.uuid4())
    db_category = DBCategory(
        id=category_id,
        name=category["name"],
        description=category.get("description"),
        type=category["type"]
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return {"id": db_category.id, "name": db_category.name, "description": db_category.description, "type": db_category.type}

@app.put("/categories/{category_id}")
async def update_category(category_id: str, category: dict, db: Session = Depends(get_db)):
    db_category = db.query(DBCategory).filter(DBCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    for field, value in category.items():
        if hasattr(db_category, field):
            setattr(db_category, field, value)
    
    db.commit()
    db.refresh(db_category)
    return {"id": db_category.id, "name": db_category.name, "description": db_category.description, "type": db_category.type}

@app.delete("/categories/{category_id}")
async def delete_category(category_id: str, db: Session = Depends(get_db)):
    category = db.query(DBCategory).filter(DBCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if category.type == "medicine":
        count = db.query(DBMedicine).filter(DBMedicine.category_id == category_id).count()
        if count > 0:
            raise HTTPException(status_code=400, detail="Cannot delete: category has medicines")
    elif category.type == "medical_device":
        count = db.query(DBMedicalDevice).filter(DBMedicalDevice.category_id == category_id).count()
        if count > 0:
            raise HTTPException(status_code=400, detail="Cannot delete: category has medical devices")

    db.delete(category)
    db.commit()
    return {"message": "Category deleted"}

# Employee endpoints
@app.get("/employees", response_model=List[Employee])
async def get_employees(branch_id: Optional[str] = None, db: Session = Depends(get_db)):
    if branch_id and branch_id != "null" and branch_id != "undefined":
        db_employees = db.query(DBEmployee).filter(DBEmployee.branch_id == branch_id).all()
    else:
        db_employees = db.query(DBEmployee).filter(DBEmployee.branch_id.is_(None)).all()
    return [Employee.model_validate(employee) for employee in db_employees]

@app.post("/employees", response_model=Employee)
async def create_employee(employee: EmployeeCreate, db: Session = Depends(get_db)):
    employee_id = str(uuid.uuid4())
    db_employee = DBEmployee(
        id=employee_id,
        first_name=employee.first_name,
        last_name=employee.last_name,
        phone=employee.phone,
        address=employee.address,
        branch_id=employee.branch_id
    )
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return Employee.model_validate(db_employee)

@app.put("/employees/{employee_id}", response_model=Employee)
async def update_employee(employee_id: str, employee: EmployeeUpdate, db: Session = Depends(get_db)):
    db_employee = db.query(DBEmployee).filter(DBEmployee.id == employee_id).first()
    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    for field, value in employee.model_dump(exclude_unset=True).items():
        setattr(db_employee, field, value)
    
    db.commit()
    db.refresh(db_employee)
    return Employee.model_validate(db_employee)

@app.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, db: Session = Depends(get_db)):
    employee = db.query(DBEmployee).filter(DBEmployee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    db.delete(employee)
    db.commit()
    return {"message": "Employee deleted"}

# Patient endpoints
@app.get("/patients", response_model=List[Patient])
async def get_patients(branch_id: Optional[str] = None, db: Session = Depends(get_db)):
    if branch_id and branch_id != "null" and branch_id != "undefined":
        db_patients = db.query(DBPatient).filter(DBPatient.branch_id == branch_id).all()
    else:
        db_patients = db.query(DBPatient).all()
    return [Patient.model_validate(patient) for patient in db_patients]

@app.post("/patients", response_model=Patient)
async def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    patient_id = str(uuid.uuid4())
    db_patient = DBPatient(
        id=patient_id,
        first_name=patient.first_name,
        last_name=patient.last_name,
        illness=patient.illness,
        phone=patient.phone,
        address=patient.address,
        branch_id=patient.branch_id
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return Patient.model_validate(db_patient)

@app.put("/patients/{patient_id}", response_model=Patient)
async def update_patient(patient_id: str, patient: PatientUpdate, db: Session = Depends(get_db)):
    db_patient = db.query(DBPatient).filter(DBPatient.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    for field, value in patient.model_dump(exclude_unset=True).items():
        setattr(db_patient, field, value)
    
    db.commit()
    db.refresh(db_patient)
    return Patient.model_validate(db_patient)

@app.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(DBPatient).filter(DBPatient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    db.delete(patient)
    db.commit()
    return {"message": "Patient deleted"}

# Transfer endpoints
@app.get("/transfers", response_model=List[Transfer])
async def get_transfers(branch_id: Optional[str] = None, db: Session = Depends(get_db)):
    if branch_id and branch_id != "null" and branch_id != "undefined":
        db_transfers = db.query(DBTransfer).filter(DBTransfer.to_branch_id == branch_id).all()
    else:
        db_transfers = db.query(DBTransfer).all()
    return [Transfer.model_validate(transfer) for transfer in db_transfers]

@app.post("/transfers")
async def create_transfers(batch: BatchTransferCreate, db: Session = Depends(get_db)):
    try:
        for transfer_data in batch.transfers:
            # Check main warehouse medicine
            main_medicine = db.query(DBMedicine).filter(
                DBMedicine.id == transfer_data.medicine_id,
                DBMedicine.branch_id.is_(None)
            ).first()
            
            if not main_medicine or main_medicine.quantity < transfer_data.quantity:
                raise HTTPException(status_code=400, detail=f"Not enough {transfer_data.medicine_name} in main warehouse")
            
            # Decrease quantity in main warehouse
            main_medicine.quantity -= transfer_data.quantity
            
            # Find or create medicine in branch
            branch_medicine = db.query(DBMedicine).filter(
                DBMedicine.name == transfer_data.medicine_name,
                DBMedicine.branch_id == transfer_data.to_branch_id
            ).first()
            
            if branch_medicine:
                branch_medicine.quantity += transfer_data.quantity
            else:
                new_branch_medicine = DBMedicine(
                    id=str(uuid.uuid4()),
                    name=transfer_data.medicine_name,
                    category_id=main_medicine.category_id,
                    purchase_price=main_medicine.purchase_price,
                    sell_price=main_medicine.sell_price,
                    quantity=transfer_data.quantity,
                    branch_id=transfer_data.to_branch_id
                )
                db.add(new_branch_medicine)
            
            # Create transfer record
            db_transfer = DBTransfer(
                id=str(uuid.uuid4()),
                medicine_id=transfer_data.medicine_id,
                medicine_name=transfer_data.medicine_name,
                quantity=transfer_data.quantity,
                from_branch_id=transfer_data.from_branch_id or "main",
                to_branch_id=transfer_data.to_branch_id
            )
            db.add(db_transfer)
        
        db.commit()
        return {"message": "Transfers completed"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

# Shipment endpoints
@app.get("/shipments")
async def get_shipments(branch_id: Optional[str] = None, db: Session = Depends(get_db)):
    if branch_id and branch_id != "null" and branch_id != "undefined":
        shipments = db.query(DBShipment).filter(DBShipment.to_branch_id == branch_id).all()
    else:
        shipments = db.query(DBShipment).all()

    result = []
    for shipment in shipments:
        items = db.query(DBShipmentItem).filter(DBShipmentItem.shipment_id == shipment.id).all()
        out_items = []
        meds_raw = []
        devices_raw = []
        for it in items:
            if it.item_type == "medicine":
                med = db.query(DBMedicine).get(it.item_id)
                name = med.name if med else it.item_name
                out_items.append({
                    "type": "medicine",
                    "id": it.item_id,
                    "name": name,
                    "quantity": it.quantity,
                })
                meds_raw.append({
                    "medicine_id": it.item_id,
                    "medicine_name": name,
                    "quantity": it.quantity,
                })
            else:
                dev = db.query(DBMedicalDevice).get(it.item_id)
                name = dev.name if dev else it.item_name
                out_items.append({
                    "type": "medical_device",
                    "id": it.item_id,
                    "name": name,
                    "quantity": it.quantity,
                })
                devices_raw.append({
                    "device_id": it.item_id,
                    "device_name": name,
                    "quantity": it.quantity,
                })

        shipment_data = {
            "id": shipment.id,
            "to_branch_id": shipment.to_branch_id,
            "status": shipment.status,
            "rejection_reason": shipment.rejection_reason,
            "created_at": shipment.created_at.isoformat(),
            "accepted_at": shipment.accepted_at.isoformat() if shipment.accepted_at else None,
            "items": out_items,
        }
        if meds_raw:
            shipment_data["medicines"] = meds_raw
        if devices_raw:
            shipment_data["medical_devices"] = devices_raw
        result.append(shipment_data)

    return {"data": result}

@app.post("/shipments")
async def create_shipment(shipment_data: dict, db: Session = Depends(get_db)):
    try:
        shipment_id = str(uuid.uuid4())
        
        # Create shipment
        db_shipment = DBShipment(
            id=shipment_id,
            to_branch_id=shipment_data["to_branch_id"],
            status="pending"
        )
        db.add(db_shipment)
        
        # Add medicines
        if "medicines" in shipment_data:
            for medicine_item in shipment_data["medicines"]:
                medicine = db.query(DBMedicine).filter(
                    DBMedicine.id == medicine_item["medicine_id"],
                    DBMedicine.branch_id.is_(None)
                ).first()
                
                if not medicine or medicine.quantity < medicine_item["quantity"]:
                    raise HTTPException(status_code=400, detail=f"Insufficient medicine quantity")
                
                # Create shipment item
                db_item = DBShipmentItem(
                    id=str(uuid.uuid4()),
                    shipment_id=shipment_id,
                    item_type="medicine",
                    item_id=medicine_item["medicine_id"],
                    item_name=medicine.name,
                    quantity=medicine_item["quantity"]
                )
                db.add(db_item)
        
        # Add medical devices
        if "medical_devices" in shipment_data:
            for device_item in shipment_data["medical_devices"]:
                device = db.query(DBMedicalDevice).filter(
                    DBMedicalDevice.id == device_item["device_id"],
                    DBMedicalDevice.branch_id.is_(None)
                ).first()
                
                if not device or device.quantity < device_item["quantity"]:
                    raise HTTPException(status_code=400, detail=f"Insufficient medical device quantity")
                
                # Create shipment item
                db_item = DBShipmentItem(
                    id=str(uuid.uuid4()),
                    shipment_id=shipment_id,
                    item_type="medical_device",
                    item_id=device_item["device_id"],
                    item_name=device.name,
                    quantity=device_item["quantity"]
                )
                db.add(db_item)
        
        # Create notification for branch
        notification = DBNotification(
            id=str(uuid.uuid4()),
            branch_id=shipment_data["to_branch_id"],
            title="Новая отправка",
            message=f"Поступление от главного склада",
            is_read=0
        )
        db.add(notification)
        
        db.commit()
        return {"message": "Shipment created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/shipments/{shipment_id}/accept")
async def accept_shipment(shipment_id: str, db: Session = Depends(get_db)):
    shipment = db.query(DBShipment).filter(DBShipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    if shipment.status != "pending":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already processed")

    try:
        items = db.query(DBShipmentItem).filter(DBShipmentItem.shipment_id == shipment_id).all()
        out_items = []
        meds_raw = []
        devices_raw = []
        for item in items:
            if item.item_type == "medicine":
                main_medicine = db.query(DBMedicine).filter(
                    DBMedicine.id == item.item_id,
                    DBMedicine.branch_id.is_(None)
                ).first()
                if main_medicine:
                    main_medicine.quantity -= item.quantity

                branch_medicine = db.query(DBMedicine).filter(
                    DBMedicine.name == item.item_name,
                    DBMedicine.branch_id == shipment.to_branch_id
                ).first()

                if branch_medicine:
                    branch_medicine.quantity += item.quantity
                else:
                    new_medicine = DBMedicine(
                        id=str(uuid.uuid4()),
                        name=item.item_name,
                        category_id=main_medicine.category_id if main_medicine else None,
                        purchase_price=main_medicine.purchase_price if main_medicine else 0,
                        sell_price=main_medicine.sell_price if main_medicine else 0,
                        quantity=item.quantity,
                        branch_id=shipment.to_branch_id
                    )
                    db.add(new_medicine)

                name = main_medicine.name if main_medicine else item.item_name
                out_items.append({
                    "type": "medicine",
                    "id": item.item_id,
                    "name": name,
                    "quantity": item.quantity,
                })
                meds_raw.append({
                    "medicine_id": item.item_id,
                    "medicine_name": name,
                    "quantity": item.quantity,
                })

            else:
                main_device = db.query(DBMedicalDevice).filter(
                    DBMedicalDevice.id == item.item_id,
                    DBMedicalDevice.branch_id.is_(None)
                ).first()
                if main_device:
                    main_device.quantity -= item.quantity

                branch_device = db.query(DBMedicalDevice).filter(
                    DBMedicalDevice.name == item.item_name,
                    DBMedicalDevice.branch_id == shipment.to_branch_id
                ).first()

                if branch_device:
                    branch_device.quantity += item.quantity
                else:
                    new_device = DBMedicalDevice(
                        id=str(uuid.uuid4()),
                        name=item.item_name,
                        category_id=main_device.category_id if main_device else None,
                        purchase_price=main_device.purchase_price if main_device else 0,
                        sell_price=main_device.sell_price if main_device else 0,
                        quantity=item.quantity,
                        branch_id=shipment.to_branch_id
                    )
                    db.add(new_device)

                name = main_device.name if main_device else item.item_name
                out_items.append({
                    "type": "medical_device",
                    "id": item.item_id,
                    "name": name,
                    "quantity": item.quantity,
                })
                devices_raw.append({
                    "device_id": item.item_id,
                    "device_name": name,
                    "quantity": item.quantity,
                })

        shipment.status = "accepted"
        shipment.accepted_at = datetime.utcnow()
        db.commit()

        return {
            "id": shipment.id,
            "to_branch_id": shipment.to_branch_id,
            "status": shipment.status,
            "rejection_reason": shipment.rejection_reason,
            "created_at": shipment.created_at.isoformat(),
            "accepted_at": shipment.accepted_at.isoformat() if shipment.accepted_at else None,
            "items": out_items,
            "medicines": meds_raw or None,
            "medical_devices": devices_raw or None,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/shipments/{shipment_id}/reject")
async def reject_shipment(shipment_id: str, reason: dict, db: Session = Depends(get_db)):
    shipment = db.query(DBShipment).filter(DBShipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    shipment.status = "rejected"
    shipment.rejection_reason = reason.get("reason", "")
    db.commit()
    return {"message": "Shipment rejected"}

@app.put("/shipments/{shipment_id}/status")
async def update_shipment_status(shipment_id: str, status_data: dict, db: Session = Depends(get_db)):
    shipment = db.query(DBShipment).filter(DBShipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    shipment.status = status_data["status"]
    db.commit()
    return {"message": "Shipment status updated"}

# Notification endpoints
@app.get("/notifications")
async def get_notifications(branch_id: Optional[str] = None, db: Session = Depends(get_db)):
    if branch_id:
        notifications = db.query(DBNotification).filter(DBNotification.branch_id == branch_id).order_by(DBNotification.created_at.desc()).all()
    else:
        notifications = db.query(DBNotification).order_by(DBNotification.created_at.desc()).all()
    
    return {
        "data": [
            {
                "id": n.id,
                "branch_id": n.branch_id,
                "title": n.title,
                "message": n.message,
                "is_read": bool(n.is_read),
                "created_at": n.created_at.isoformat()
            }
            for n in notifications
        ]
    }

@app.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, db: Session = Depends(get_db)):
    notification = db.query(DBNotification).filter(DBNotification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = 1
    db.commit()
    return {"message": "Notification marked as read"}

# Last receipt endpoints
@app.get("/branches/{branch_id}/items/medicine/{medicine_id}/last_receipt")
async def get_last_medicine_receipt(branch_id: str, medicine_id: str, db: Session = Depends(get_db)):
    result = (
        db.query(DBShipmentItem, DBShipment)
        .join(DBShipment, DBShipmentItem.shipment_id == DBShipment.id)
        .filter(
            DBShipment.to_branch_id == branch_id,
            DBShipment.status == "accepted",
            DBShipmentItem.item_type == "medicine",
            DBShipmentItem.item_id == medicine_id,
        )
        .order_by(DBShipment.created_at.desc())
        .first()
    )
    if result:
        item, shipment = result
        return {"quantity": item.quantity, "time": shipment.created_at}
    return None

@app.get("/branches/{branch_id}/items/device/{device_id}/last_receipt")
async def get_last_device_receipt(branch_id: str, device_id: str, db: Session = Depends(get_db)):
    result = (
        db.query(DBShipmentItem, DBShipment)
        .join(DBShipment, DBShipmentItem.shipment_id == DBShipment.id)
        .filter(
            DBShipment.to_branch_id == branch_id,
            DBShipment.status == "accepted",
            DBShipmentItem.item_type == "medical_device",
            DBShipmentItem.item_id == device_id,
        )
        .order_by(DBShipment.created_at.desc())
        .first()
    )
    if result:
        item, shipment = result
        return {"quantity": item.quantity, "time": shipment.created_at}
    return None

# Dispensing endpoints
@app.get("/dispensing_records")
async def get_dispensing_records(branch_id: Optional[str] = None, db: Session = Depends(get_db)):
    if branch_id and branch_id != "null" and branch_id != "undefined":
        records = db.query(DBDispensingRecord).filter(DBDispensingRecord.branch_id == branch_id).all()
    else:
        records = db.query(DBDispensingRecord).all()
    
    result = []
    for record in records:
        items = db.query(DBDispensingItem).filter(DBDispensingItem.record_id == record.id).all()
        
        record_data = {
            "id": record.id,
            "patient_id": record.patient_id,
            "patient_name": record.patient_name,
            "employee_id": record.employee_id,
            "employee_name": record.employee_name,
            "branch_id": record.branch_id,
            "date": record.date.isoformat(),
            "medicines": [],
            "medical_devices": []
        }
        
        for item in items:
            if item.item_type == "medicine":
                record_data["medicines"].append({
                    "medicine_name": item.item_name,
                    "quantity": item.quantity
                })
            else:
                record_data["medical_devices"].append({
                    "device_name": item.item_name,
                    "quantity": item.quantity
                })
        
        result.append(record_data)
    
    return {"data": result}

@app.post("/dispensing")
async def create_dispensing_record(request: dict, db: Session = Depends(get_db)):
    try:
        patient_id = request["patient_id"]
        employee_id = request["employee_id"]
        branch_id = request["branch_id"]
        items = request["items"]
        
        # Get patient and employee names
        patient = db.query(DBPatient).filter(DBPatient.id == patient_id).first()
        employee = db.query(DBEmployee).filter(DBEmployee.id == employee_id).first()
        
        if not patient or not employee:
            raise HTTPException(status_code=404, detail="Patient or employee not found")
        
        # Create dispensing record
        record_id = str(uuid.uuid4())
        db_record = DBDispensingRecord(
            id=record_id,
            patient_id=patient_id,
            patient_name=f"{patient.first_name} {patient.last_name}",
            employee_id=employee_id,
            employee_name=f"{employee.first_name} {employee.last_name}",
            branch_id=branch_id
        )
        db.add(db_record)
        
        # Process items
        for item in items:
            if item["type"] == "medicine":
                # Decrease medicine quantity
                medicine = db.query(DBMedicine).filter(
                    DBMedicine.id == item["id"],
                    DBMedicine.branch_id == branch_id
                ).first()
                
                if not medicine or medicine.quantity < item["quantity"]:
                    raise HTTPException(status_code=400, detail=f"Insufficient quantity for {item['name']}")
                
                medicine.quantity -= item["quantity"]
                
                # Create dispensing item
                db_item = DBDispensingItem(
                    id=str(uuid.uuid4()),
                    record_id=record_id,
                    item_type="medicine",
                    item_id=item["id"],
                    item_name=item["name"],
                    quantity=item["quantity"]
                )
                db.add(db_item)
            
            elif item["type"] == "medical_device":
                # Decrease medical device quantity
                device = db.query(DBMedicalDevice).filter(
                    DBMedicalDevice.id == item["id"],
                    DBMedicalDevice.branch_id == branch_id
                ).first()
                
                if not device or device.quantity < item["quantity"]:
                    raise HTTPException(status_code=400, detail=f"Insufficient quantity for {item['name']}")
                
                device.quantity -= item["quantity"]
                
                # Create dispensing item
                db_item = DBDispensingItem(
                    id=str(uuid.uuid4()),
                    record_id=record_id,
                    item_type="medical_device",
                    item_id=item["id"],
                    item_name=item["name"],
                    quantity=item["quantity"]
                )
                db.add(db_item)
        
        db.commit()
        return {"message": "Dispensing record created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

# Arrival endpoints
@app.get("/arrivals")
async def get_arrivals(db: Session = Depends(get_db)):
    arrivals = db.query(DBArrival).all()
    return {"data": [Arrival.model_validate(arrival) for arrival in arrivals]}

@app.post("/arrivals")
async def create_arrivals(batch: BatchArrivalCreate, db: Session = Depends(get_db)):
    try:
        for arrival_data in batch.arrivals:
            # Create arrival record
            sell_price = arrival_data.sell_price if arrival_data.sell_price is not None else 0
            db_arrival = DBArrival(
                id=str(uuid.uuid4()),
                medicine_id=arrival_data.medicine_id,
                medicine_name=arrival_data.medicine_name,
                quantity=arrival_data.quantity,
                purchase_price=arrival_data.purchase_price,
                sell_price=sell_price
            )
            db.add(db_arrival)
            
            # Update medicine quantity in main warehouse
            medicine = db.query(DBMedicine).filter(
                DBMedicine.id == arrival_data.medicine_id,
                DBMedicine.branch_id.is_(None)
            ).first()
            
            if medicine:
                medicine.quantity += arrival_data.quantity
                medicine.purchase_price = arrival_data.purchase_price
                if arrival_data.sell_price is not None:
                    medicine.sell_price = arrival_data.sell_price
        
        db.commit()
        return {"message": "Arrivals created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/device_arrivals")
async def get_device_arrivals(db: Session = Depends(get_db)):
    arrivals = db.query(DBDeviceArrival).all()
    return {"data": [DeviceArrival.model_validate(a) for a in arrivals]}


@app.post("/device_arrivals")
async def create_device_arrivals(batch: BatchDeviceArrivalCreate, db: Session = Depends(get_db)):
    try:
        for arrival_data in batch.arrivals:
            sell_price = arrival_data.sell_price if arrival_data.sell_price is not None else 0
            db_arrival = DBDeviceArrival(
                id=str(uuid.uuid4()),
                device_id=arrival_data.device_id,
                device_name=arrival_data.device_name,
                quantity=arrival_data.quantity,
                purchase_price=arrival_data.purchase_price,
                sell_price=sell_price,
            )
            db.add(db_arrival)

            device = db.query(DBMedicalDevice).filter(
                DBMedicalDevice.id == arrival_data.device_id,
                DBMedicalDevice.branch_id.is_(None),
            ).first()
            if device:
                device.quantity += arrival_data.quantity
                device.purchase_price = arrival_data.purchase_price
                if arrival_data.sell_price is not None:
                    device.sell_price = arrival_data.sell_price

        db.commit()
        return {"message": "Device arrivals created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

# Report endpoints
@app.post("/reports/generate")
async def generate_report(request: ReportRequest, db: Session = Depends(get_db)):
    try:
        report_data = []
        
        if request.type == "stock":
            if request.branch_id:
                medicines = db.query(DBMedicine).filter(DBMedicine.branch_id == request.branch_id).all()
                devices = db.query(DBMedicalDevice).filter(DBMedicalDevice.branch_id == request.branch_id).all()
            else:
                medicines = db.query(DBMedicine).filter(DBMedicine.branch_id.is_(None)).all()
                devices = db.query(DBMedicalDevice).filter(DBMedicalDevice.branch_id.is_(None)).all()
            
            for med in medicines:
                report_data.append({
                    "id": med.id,
                    "name": med.name,
                    "type": "medicine",
                    "quantity": med.quantity,
                    "purchase_price": med.purchase_price,
                    "sell_price": med.sell_price
                })
            
            for dev in devices:
                report_data.append({
                    "id": dev.id,
                    "name": dev.name,
                    "type": "medical_device",
                    "quantity": dev.quantity,
                    "purchase_price": dev.purchase_price,
                    "sell_price": dev.sell_price
                })
        
        elif request.type == "dispensing":
            query = db.query(DBDispensingRecord)
            if request.branch_id:
                query = query.filter(DBDispensingRecord.branch_id == request.branch_id)
            if request.date_from:
                query = query.filter(DBDispensingRecord.date >= request.date_from)
            if request.date_to:
                query = query.filter(DBDispensingRecord.date <= request.date_to)
            
            records = query.all()
            for record in records:
                report_data.append({
                    "id": record.id,
                    "patient_name": record.patient_name,
                    "employee_name": record.employee_name,
                    "date": record.date.isoformat(),
                    "branch_id": record.branch_id
                })
        
        elif request.type == "arrivals":
            query = db.query(DBArrival)
            if request.date_from:
                query = query.filter(DBArrival.date >= request.date_from)
            if request.date_to:
                query = query.filter(DBArrival.date <= request.date_to)
            
            arrivals = query.all()
            for arrival in arrivals:
                report_data.append({
                    "id": arrival.id,
                    "medicine_name": arrival.medicine_name,
                    "quantity": arrival.quantity,
                    "purchase_price": arrival.purchase_price,
                    "sell_price": arrival.sell_price,
                    "date": arrival.date.isoformat()
                })
        
        elif request.type == "transfers":
            query = db.query(DBTransfer)
            if request.branch_id:
                query = query.filter(DBTransfer.to_branch_id == request.branch_id)
            if request.date_from:
                query = query.filter(DBTransfer.date >= request.date_from)
            if request.date_to:
                query = query.filter(DBTransfer.date <= request.date_to)
            
            transfers = query.all()
            for transfer in transfers:
                report_data.append({
                    "id": transfer.id,
                    "medicine_name": transfer.medicine_name,
                    "quantity": transfer.quantity,
                    "from_branch_id": transfer.from_branch_id,
                    "to_branch_id": transfer.to_branch_id,
                    "date": transfer.date.isoformat()
                })
        
        elif request.type == "patients":
            query = db.query(DBPatient)
            if request.branch_id:
                query = query.filter(DBPatient.branch_id == request.branch_id)
            
            patients = query.all()
            for patient in patients:
                report_data.append({
                    "id": patient.id,
                    "first_name": patient.first_name,
                    "last_name": patient.last_name,
                    "illness": patient.illness,
                    "phone": patient.phone,
                    "address": patient.address,
                    "branch_id": patient.branch_id
                })
        
        elif request.type == "medical_devices":
            if request.branch_id:
                devices = db.query(DBMedicalDevice).filter(DBMedicalDevice.branch_id == request.branch_id).all()
            else:
                devices = db.query(DBMedicalDevice).filter(DBMedicalDevice.branch_id.is_(None)).all()
            
            for device in devices:
                report_data.append({
                    "id": device.id,
                    "name": device.name,
                    "quantity": device.quantity,
                    "purchase_price": device.purchase_price,
                    "sell_price": device.sell_price,
                    "branch_id": device.branch_id
                })
        
        return {"data": report_data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Calendar endpoints
@app.get("/calendar/dispensing")
async def get_calendar_dispensing(branch_id: Optional[str] = None, month: Optional[int] = None, year: Optional[int] = None, db: Session = Depends(get_db)):
    try:
        query = db.query(DBDispensingRecord)
        if branch_id:
            query = query.filter(DBDispensingRecord.branch_id == branch_id)
        if month and year:
            query = query.filter(
                db.extract('month', DBDispensingRecord.date) == month,
                db.extract('year', DBDispensingRecord.date) == year
            )
        
        records = query.all()
        calendar_data = {}
        
        for record in records:
            day = record.date.day
            if day not in calendar_data:
                calendar_data[day] = []
            
            calendar_data[day].append({
                "id": record.id,
                "patient_name": record.patient_name,
                "employee_name": record.employee_name,
                "time": record.date.strftime("%H:%M")
            })
        
        return {"data": calendar_data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)