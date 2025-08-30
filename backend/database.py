
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123@localhost:5432/clinic_bot")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    login = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    branch_name = Column(String, nullable=True)

class Branch(Base):
    __tablename__ = "branches"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    login = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    category_id = Column(String, ForeignKey("categories.id"), nullable=False)
    purchase_price = Column(Float, nullable=False, default=0.0)
    sell_price = Column(Float, nullable=False, default=0.0)
    quantity = Column(Integer, nullable=False, default=0)
    branch_id = Column(String, ForeignKey("branches.id"), nullable=True)

class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(String, primary_key=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    address = Column(String, nullable=False)
    branch_id = Column(String, ForeignKey("branches.id"), nullable=True)

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(String, primary_key=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    illness = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    address = Column(String, nullable=False)
    branch_id = Column(String, ForeignKey("branches.id"), nullable=True)

class Transfer(Base):
    __tablename__ = "transfers"
    
    id = Column(String, primary_key=True)
    medicine_id = Column(String, nullable=False)
    medicine_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    from_branch_id = Column(String, nullable=True)
    to_branch_id = Column(String, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)

class DispensingRecord(Base):
    __tablename__ = "dispensing_records"
    
    id = Column(String, primary_key=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    patient_name = Column(String, nullable=False)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=False)
    employee_name = Column(String, nullable=False)
    branch_id = Column(String, ForeignKey("branches.id"), nullable=False)
    date = Column(DateTime, default=datetime.utcnow)

class DispensingItem(Base):
    __tablename__ = "dispensing_items"
    
    id = Column(String, primary_key=True)
    record_id = Column(String, ForeignKey("dispensing_records.id"), nullable=False)
    item_type = Column(String, nullable=False)  # 'medicine' or 'medical_device'
    item_id = Column(String, nullable=False)
    item_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)

class Arrival(Base):
    __tablename__ = "arrivals"
    
    id = Column(String, primary_key=True)
    medicine_id = Column(String, nullable=False)
    medicine_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    purchase_price = Column(Float, nullable=False)
    sell_price = Column(Float, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)


class DeviceArrival(Base):
    __tablename__ = "device_arrivals"

    id = Column(String, primary_key=True)
    device_id = Column(String, nullable=False)
    device_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    purchase_price = Column(Float, nullable=False)
    sell_price = Column(Float, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    type = Column(String, nullable=False)  # 'medicine' or 'medical_device'

class MedicalDevice(Base):
    __tablename__ = "medical_devices"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    category_id = Column(String, ForeignKey("categories.id"), nullable=False)
    purchase_price = Column(Float, nullable=False, default=0.0)
    sell_price = Column(Float, nullable=False, default=0.0)
    quantity = Column(Integer, nullable=False, default=0)
    branch_id = Column(String, ForeignKey("branches.id"), nullable=True)

class Shipment(Base):
    __tablename__ = "shipments"
    
    id = Column(String, primary_key=True)
    to_branch_id = Column(String, ForeignKey("branches.id"), nullable=False)
    status = Column(String, default="pending")  # pending, accepted, rejected, cancelled
    rejection_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ShipmentItem(Base):
    __tablename__ = "shipment_items"
    
    id = Column(String, primary_key=True)
    shipment_id = Column(String, ForeignKey("shipments.id"), nullable=False)
    item_type = Column(String, nullable=False)  # medicine or device
    item_id = Column(String, nullable=False)
    item_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String, primary_key=True)
    branch_id = Column(String, ForeignKey("branches.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    is_read = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create tables
def create_tables():
    Base.metadata.create_all(bind=engine)
