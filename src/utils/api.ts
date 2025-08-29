const strip = (s: string) => {
  let r = s;
  while (r.endsWith('/')) r = r.slice(0, -1);
  return r;
};
const isDev = import.meta.env.DEV;

function resolveBaseUrl() {
  const env = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
  if (isDev) return '/api';
  if (env) return strip(env);
  const proto = window.location.protocol;
  const host = window.location.hostname;
  const port = import.meta.env.VITE_API_PORT ?? (proto === 'https:' ? '443' : '8000');
  return `${proto}//${host}:${port}`;
}

export const API_BASE_URL = resolveBaseUrl();
console.info('API_BASE_URL=', API_BASE_URL);

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any, message?: string) {
    super(message ?? body?.detail ?? `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function fetchWithTimeout(input: RequestInfo, init: RequestInit = {}, ms = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

interface LoginData {
  login: string;
  password: string;
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<{ data: T }> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const res = await fetchWithTimeout(url, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) throw new ApiError(res.status, data);
    return { data: data as T };
  }

  // Auth
  async login(credentials: LoginData) {
    return this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  // Users
  async getUsers() {
    return this.request<any[]>('/users');
  }

  async createUser(user: any) {
    return this.request<any>('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  async updateUser(userId: string, user: any) {
    return this.request<any>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }

  async deleteUser(userId: string) {
    return this.request<any>(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Branches
  async getBranches() {
    return this.request<any[]>('/branches');
  }

  async createBranch(branch: any) {
    return this.request<any>('/branches', {
      method: 'POST',
      body: JSON.stringify(branch),
    });
  }

  async updateBranch(branchId: string, branch: any) {
    return this.request<any>(`/branches/${branchId}`, {
      method: 'PUT',
      body: JSON.stringify(branch),
    });
  }

  async deleteBranch(branchId: string) {
    return this.request<any>(`/branches/${branchId}`, {
      method: 'DELETE',
    });
  }

  // Medicines
  async getMedicines(branchId?: string) {
    const params = branchId ? `?branch_id=${branchId}` : '';
    return this.request<any[]>(`/medicines${params}`);
  }

  async createMedicine(medicine: any) {
    return this.request<any>('/medicines', {
      method: 'POST',
      body: JSON.stringify(medicine),
    });
  }

  async updateMedicine(medicineId: string, medicine: any) {
    return this.request<any>(`/medicines/${medicineId}`, {
      method: 'PUT',
      body: JSON.stringify(medicine),
    });
  }

  async deleteMedicine(medicineId: string) {
    return this.request<any>(`/medicines/${medicineId}`, {
      method: 'DELETE',
    });
  }

  // Employees
  async getEmployees(branchId?: string) {
    const params = branchId ? `?branch_id=${branchId}` : '';
    return this.request<any[]>(`/employees${params}`);
  }

  async createEmployee(employee: any) {
    return this.request<any>('/employees', {
      method: 'POST',
      body: JSON.stringify(employee),
    });
  }

  async updateEmployee(employeeId: string, employee: any) {
    return this.request<any>(`/employees/${employeeId}`, {
      method: 'PUT',
      body: JSON.stringify(employee),
    });
  }

  async deleteEmployee(employeeId: string) {
    return this.request<any>(`/employees/${employeeId}`, {
      method: 'DELETE',
    });
  }

  // Patients
  async getPatients(branchId?: string) {
    const params = branchId ? `?branch_id=${branchId}` : '';
    return this.request<any[]>(`/patients${params}`);
  }

  async createPatient(patient: any) {
    return this.request<any>('/patients', {
      method: 'POST',
      body: JSON.stringify(patient),
    });
  }

  async updatePatient(patientId: string, patient: any) {
    return this.request<any>(`/patients/${patientId}`, {
      method: 'PUT',
      body: JSON.stringify(patient),
    });
  }

  async deletePatient(patientId: string) {
    return this.request<any>(`/patients/${patientId}`, {
      method: 'DELETE',
    });
  }

  // Transfers
  async getTransfers(branchId?: string) {
    const params = branchId ? `?branch_id=${branchId}` : '';
    return this.request<any[]>(`/transfers${params}`);
  }

  async createTransfers(transfers: any[]) {
    return this.request<any>('/transfers', {
      method: 'POST',
      body: JSON.stringify({ transfers }),
    });
  }

  // Dispensings
  async getDispensings(branchId?: string) {
    const params = branchId ? `?branch_id=${branchId}` : '';
    const res = await this.request<any>(`/dispensing_records${params}`);
    if (res.data && 'data' in res.data) {
      return { data: res.data.data };
    }
    return res;
  }

  // Arrivals
  async getArrivals() {
    return this.request<any[]>('/arrivals');
  }

  async createArrivals(arrivals: any[]) {
    return this.request<any>('/arrivals', {
      method: 'POST',
      body: JSON.stringify({ arrivals }),
    });
  }

  // Device arrivals
  async getDeviceArrivals() {
    return this.request<any[]>('/device_arrivals');
  }

  async createDeviceArrivals(arrivals: any[]) {
    return this.request<any>('/device_arrivals', {
      method: 'POST',
      body: JSON.stringify({ arrivals }),
    });
  }

  // Medical Device Categories (proxy to categories API)
  async getMedicalDeviceCategories() {
    // Use unified categories endpoint
    return this.request<any[]>(`/categories?type=medical_device`);
  }

  async createMedicalDeviceCategory(category: any) {
    return this.request<any>('/categories', {
      method: 'POST',
      body: JSON.stringify({ ...category, type: 'medical_device' }),
    });
  }

  async updateMedicalDeviceCategory(categoryId: string, categoryData: any) {
    return this.request<any>(`/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...categoryData, type: 'medical_device' }),
    });
  }

  async deleteMedicalDeviceCategory(categoryId: string) {
    return this.request<any>(`/categories/${categoryId}`, {
      method: 'DELETE',
    });
  }

  // Medical Devices
  async getMedicalDevices(branchId?: string) {
    const params = branchId ? `?branch_id=${branchId}` : '';
    return this.request<any[]>(`/medical_devices${params}`);
  }

  async createMedicalDevice(device: any) {
    return this.request<any>('/medical_devices', {
      method: 'POST',
      body: JSON.stringify(device),
    });
  }

  async updateMedicalDevice(deviceId: string, device: any) {
    return this.request<any>(`/medical_devices/${deviceId}`, {
      method: 'PUT',
      body: JSON.stringify(device),
    });
  }

  async deleteMedicalDevice(deviceId: string) {
    return this.request<any>(`/medical_devices/${deviceId}`, {
      method: 'DELETE',
    });
  }

  // Shipments
  async getShipments(branchId?: string) {
    const url = branchId ? `/shipments?branch_id=${branchId}` : '/shipments';
    const res = await this.request<any>(url);
    if (res.data && 'data' in res.data) {
      return { data: res.data.data };
    }
    return res;
  }

  async createShipment(shipment: any) {
    return this.request<any>('/shipments', {
      method: 'POST',
      body: JSON.stringify(shipment),
    });
  }

  async acceptShipment(shipmentId: string) {
    return this.request<any>(`/shipments/${shipmentId}/accept`, {
      method: 'POST',
    });
  }

  async rejectShipment(shipmentId: string, reason: string) {
    return this.request<any>(`/shipments/${shipmentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async cancelShipment(shipmentId: string) {
    return this.request<any>(`/shipments/${shipmentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'cancelled' }),
    });
  }

  async retryShipment(shipmentId: string) {
    return this.request<any>(`/shipments/${shipmentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'pending' }),
    });
  }

  // Last receipt
  async getLastReceiptMedicine(branchId: string, medicineId: string) {
    return this.request<any>(`/branches/${encodeURIComponent(branchId)}/items/medicine/${medicineId}/last_receipt`);
  }

  async getLastReceiptDevice(branchId: string, deviceId: string) {
    return this.request<any>(`/branches/${encodeURIComponent(branchId)}/items/device/${deviceId}/last_receipt`);
  }

  // Notifications
  async getNotifications(branchId: string) {
    return this.request<any[]>(`/notifications?branch_id=${branchId}`);
  }

  async markNotificationRead(notificationId: string) {
    return this.request<any>(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  // Reports
  async generateReport(params: any) {
    return this.request<any[]>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getReportDetails(reportType: string, itemId: string) {
    return this.request<any>(`/reports/${reportType}/${itemId}`);
  }

  // Categories (updated with type parameter)
  async getCategoriesByType(type?: string) {
    let url = '/categories';
    if (type) {
      url += `?type=${type}`;
    }
    return this.request<any[]>(url);
  }

  async updateCategory(categoryId: string, categoryData: any) {
    return this.request<any>(`/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
  }

  async deleteCategory(categoryId: string) {
    return this.request<any>(`/categories/${categoryId}`, {
      method: 'DELETE',
    });
  }

  // Medicine Categories
  async getMedicineCategories() {
    return this.request<any[]>('/medicine-categories');
  }

  async createMedicineCategory(categoryData: any) {
    return this.request<any>('/medicine-categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  }

  async updateMedicineCategory(categoryId: string, categoryData: any) {
    return this.request<any>(`/medicine-categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
  }

  async deleteMedicineCategory(categoryId: string) {
    return this.request<any>(`/medicine-categories/${categoryId}`, {
      method: 'DELETE',
    });
  }

  // Calendar
  async getDispensingCalendar(branchId?: string) {
    let url = '/calendar/dispensing';
    if (branchId) {
      url += `?branch_id=${branchId}`;
    }
    const res = await this.request<any>(url);
    if (res.data && 'data' in res.data) {
      return { data: res.data.data };
    }
    return res;
  }

  // Get dispensing records
  async getDispensingRecords(branchId?: string) {
    let url = '/dispensing_records';
    if (branchId) {
      url += `?branch_id=${branchId}`;
    }
    const res = await this.request<any>(url);
    if (res.data && 'data' in res.data) {
      return { data: res.data.data };
    }
    return res;
  }

  // Create dispensing record
  async createDispensingRecord(data: any) {
    return this.request('/dispensing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  // Main getCategories function
  async getCategories(type?: string) {
    let url = '/categories';
    if (type) {
      url += `?type=${type}`;
    }
    return this.request<any[]>(url);
  }

  // Create category function
  async createCategoryNew(data: any) {
    return this.request('/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
}

export const apiService = new ApiService();
