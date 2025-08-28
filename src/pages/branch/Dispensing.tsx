
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { storage } from '@/utils/storage';
import { apiService } from '@/utils/api';
import { toast } from '@/hooks/use-toast';
import { Package, Users, Heart, CheckCircle, Tag } from 'lucide-react';

const Dispensing: React.FC = () => {
  const currentUser = storage.getCurrentUser();
  const branchId = currentUser?.branchId;
  
  const [dispensings, setDispensings] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [medicalDevices, setMedicalDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedMedicines, setSelectedMedicines] = useState<Array<{medicineId: string, quantity: number}>>([]);
  const [selectedDevices, setSelectedDevices] = useState<Array<{deviceId: string, quantity: number}>>([]);

  useEffect(() => {
    fetchData();
  }, [branchId]);

  const fetchData = async () => {
    try {
      const [dispensingsRes, medicinesRes, devicesRes, employeesRes, patientsRes, categoriesRes] = await Promise.all([
        apiService.getDispensingRecords(branchId),
        apiService.getMedicines(branchId),
        apiService.getMedicalDevices(branchId),
        apiService.getEmployees(branchId),
        apiService.getPatients(branchId),
        apiService.getCategories()
      ]);

      if (dispensingsRes.data) setDispensings(dispensingsRes.data);
      if (medicinesRes.data) setMedicines(medicinesRes.data.filter(m => m.quantity > 0));
      if (devicesRes.data) setMedicalDevices(devicesRes.data.filter(d => d.quantity > 0));
      if (employeesRes.data) setEmployees(employeesRes.data);
      if (patientsRes.data) setPatients(patientsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching dispensing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedicinesByCategory = (categoryId: string) => {
    return medicines.filter(medicine => medicine.category_id === categoryId);
  };

  const getDevicesByCategory = (categoryId: string) => {
    return medicalDevices.filter(device => device.category_id === categoryId);
  };

  const addMedicineToSelection = () => {
    setSelectedMedicines([...selectedMedicines, { medicineId: '', quantity: 1 }]);
  };

  const addDeviceToSelection = () => {
    setSelectedDevices([...selectedDevices, { deviceId: '', quantity: 1 }]);
  };

  const updateSelectedMedicine = (index: number, medicineId: string, quantity: number) => {
    const updated = [...selectedMedicines];
    updated[index] = { medicineId, quantity };
    setSelectedMedicines(updated);
  };

  const updateSelectedDevice = (index: number, deviceId: string, quantity: number) => {
    const updated = [...selectedDevices];
    updated[index] = { deviceId, quantity };
    setSelectedDevices(updated);
  };

  const removeSelectedMedicine = (index: number) => {
    setSelectedMedicines(selectedMedicines.filter((_, i) => i !== index));
  };

  const removeSelectedDevice = (index: number) => {
    setSelectedDevices(selectedDevices.filter((_, i) => i !== index));
  };

  const handleDispense = async () => {
    if (!selectedEmployee || !selectedPatient || (selectedMedicines.length === 0 && selectedDevices.length === 0)) {
      toast({ title: 'Ошибка', description: 'Выберите сотрудника, пациента и товары для выдачи', variant: 'destructive' });
      return;
    }

    // Validate medicine quantities
    for (const selected of selectedMedicines) {
      if (!selected.medicineId || selected.quantity <= 0) {
        toast({ title: 'Ошибка', description: 'Выберите все лекарства и укажите количество', variant: 'destructive' });
        return;
      }
      
      const medicine = medicines.find(m => m.id === selected.medicineId);
      if (!medicine || medicine.quantity < selected.quantity) {
        toast({ title: 'Ошибка', description: `Недостаточно лекарства ${medicine?.name}`, variant: 'destructive' });
        return;
      }
    }

    // Validate device quantities
    for (const selected of selectedDevices) {
      if (!selected.deviceId || selected.quantity <= 0) {
        toast({ title: 'Ошибка', description: 'Выберите все ИМН и укажите количество', variant: 'destructive' });
        return;
      }
      
      const device = medicalDevices.find(d => d.id === selected.deviceId);
      if (!device || device.quantity < selected.quantity) {
        toast({ title: 'Ошибка', description: `Недостаточно ИМН ${device?.name}`, variant: 'destructive' });
        return;
      }
    }

    const employee = employees.find(e => e.id === selectedEmployee);
    const patient = patients.find(p => p.id === selectedPatient);
    
    try {
      // Prepare dispensing data
      const items = [];
      
      // Add medicines
      for (const selected of selectedMedicines) {
        items.push({
          type: 'medicine',
          item_id: selected.medicineId,
          quantity: selected.quantity
        });
      }
      
      // Add medical devices
      for (const selected of selectedDevices) {
        items.push({
          type: 'medical_device',
          item_id: selected.deviceId,
          quantity: selected.quantity
        });
      }

      const dispensingData = {
        patient_id: selectedPatient,
        employee_id: selectedEmployee,
        branch_id: branchId,
        items: items
      };

      const response = await apiService.createDispensingRecord(dispensingData);
      
      if (!response.error) {
        // Reset form
        setSelectedEmployee('');
        setSelectedPatient('');
        setSelectedMedicines([]);
        setSelectedDevices([]);
        
        // Refresh data
        await fetchData();
        
        toast({ title: 'Товары выданы пациенту!', description: `Выдано лекарств: ${selectedMedicines.length}, ИМН: ${selectedDevices.length}` });
      } else {
        toast({ title: 'Ошибка', description: response.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось выдать товары', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Загрузка...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Выдача лекарств</h1>
        <p className="text-gray-600 mt-2">Выдача лекарств пациентам</p>
      </div>

      {/* Dispensing form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Выдать лекарства</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label>Выберите сотрудника</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите сотрудника" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Выберите пациента</Label>
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите пациента" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name} - {patient.illness}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mb-6">
          <Label className="text-lg font-semibold">Товары для выдачи по категориям</Label>
          
          {/* Render categories */}
          {categories.map((category) => {
            const categoryMedicines = getMedicinesByCategory(category.id);
            const categoryDevices = getDevicesByCategory(category.id);
            
            if (categoryMedicines.length === 0 && categoryDevices.length === 0) return null;
            
            return (
              <div key={category.id} className="mb-4 p-4 border rounded-lg">
                <h3 className="font-semibold mb-3">{category.name}</h3>
                
                {/* Medicines in this category */}
                {categoryMedicines.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <Label>Лекарство</Label>
                      <Select 
                        onValueChange={(value) => {
                          const existing = selectedMedicines.find(m => getMedicinesByCategory(category.id).some(cm => cm.id === m.medicineId));
                          if (existing) {
                            const index = selectedMedicines.indexOf(existing);
                            updateSelectedMedicine(index, value, existing.quantity);
                          } else {
                            setSelectedMedicines([...selectedMedicines, { medicineId: value, quantity: 1 }]);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите лекарство" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryMedicines.map((medicine) => (
                            <SelectItem key={medicine.id} value={medicine.id}>
                              {medicine.name} (остаток: {medicine.quantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Количество</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          const existing = selectedMedicines.find(m => getMedicinesByCategory(category.id).some(cm => cm.id === m.medicineId));
                          if (existing && value > 0) {
                            const index = selectedMedicines.indexOf(existing);
                            updateSelectedMedicine(index, existing.medicineId, value);
                          } else if (value === 0 && existing) {
                            const index = selectedMedicines.indexOf(existing);
                            removeSelectedMedicine(index);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Medical devices in this category */}
                {categoryDevices.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>ИМН</Label>
                      <Select 
                        onValueChange={(value) => {
                          const existing = selectedDevices.find(d => getDevicesByCategory(category.id).some(cd => cd.id === d.deviceId));
                          if (existing) {
                            const index = selectedDevices.indexOf(existing);
                            updateSelectedDevice(index, value, existing.quantity);
                          } else {
                            setSelectedDevices([...selectedDevices, { deviceId: value, quantity: 1 }]);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите ИМН" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryDevices.map((device) => (
                            <SelectItem key={device.id} value={device.id}>
                              {device.name} (остаток: {device.quantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Количество</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          const existing = selectedDevices.find(d => getDevicesByCategory(category.id).some(cd => cd.id === d.deviceId));
                          if (existing && value > 0) {
                            const index = selectedDevices.indexOf(existing);
                            updateSelectedDevice(index, existing.deviceId, value);
                          } else if (value === 0 && existing) {
                            const index = selectedDevices.indexOf(existing);
                            removeSelectedDevice(index);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Button 
          onClick={handleDispense} 
          disabled={!selectedEmployee || !selectedPatient || (selectedMedicines.length === 0 && selectedDevices.length === 0)}
        >
          Выдать товары
        </Button>
      </div>

      {/* Recent dispensings */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">История выдач</h2>
        </div>
        <div className="p-6">
          {dispensings.length > 0 ? (
            <div className="space-y-4">
              {dispensings.slice(-10).reverse().map((dispensing) => (
                <div key={dispensing.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-1" />
                      <div>
                        <h3 className="font-semibold">Выдача #{dispensing.id.slice(-8)}</h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center">
                            <Heart className="h-4 w-4 mr-1 text-red-500" />
                            <span>Пациент: {dispensing.patient_name}</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1 text-blue-500" />
                            <span>Сотрудник: {dispensing.employee_name}</span>
                          </div>
                          <p>Дата: {new Date(dispensing.date).toLocaleString('ru-RU')}</p>
                          {dispensing.medicines && dispensing.medicines.length > 0 && (
                            <div>
                              <p className="font-medium">Лекарства:</p>
                              {dispensing.medicines.map((medicine: any, idx: number) => (
                                <p key={idx} className="ml-4">• {medicine.medicine_name} - {medicine.quantity} шт.</p>
                              ))}
                            </div>
                          )}
                          {dispensing.medical_devices && dispensing.medical_devices.length > 0 && (
                            <div>
                              <p className="font-medium">ИМН:</p>
                              {dispensing.medical_devices.map((device: any, idx: number) => (
                                <p key={idx} className="ml-4">• {device.device_name} - {device.quantity} шт.</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      Выдано
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">История выдач пуста</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dispensing;
