export interface User {
  id: string;
  login: string;
  password: string;
  role: 'admin' | 'branch';
  branchName?: string;
  branch_id?: string;
}

export interface Branch {
  id: string;
  name: string;
  login: string;
  password: string;
  createdAt: string;
}

export interface Medicine {
  id: string;
  name: string;
  purchasePrice: number;
  sellPrice: number;
  quantity: number;
  branchId?: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  branchId?: string;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  first_name: string;
  last_name: string;
  illness: string;
  phone: string;
  address: string;
  branchId?: string;
  branch_id?: string;
}

export interface Transfer {
  id: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  fromBranchId: string;
  toBranchId: string;
  date: string;
}

export interface Dispensing {
  id: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  patientId: string;
  patientName: string;
  employeeId: string;
  employeeName: string;
  branchId: string;
  date: string;
}

export interface MedicalDeviceCategory {
  id: string;
  name: string;
  description?: string;
}

export interface MedicalDevice {
  id: string;
  name: string;
  category_id: string;
  purchase_price: number;
  sell_price: number;
  quantity: number;
  branch_id?: string;
}

export interface Shipment {
  id: string;
  to_branch_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  medicines?: Array<{medicine_id: string, quantity: number}>;
  medical_devices?: Array<{device_id: string, quantity: number}>;
  rejection_reason?: string;
  created_at: string;
}

export interface DispensingRecord {
  id: string;
  patient_id: string;
  employee_name: string;
  date: string;
  medicines?: Array<{medicine_name: string, quantity: number}>;
  medical_devices?: Array<{device_name: string, quantity: number}>;
}