
import React, { useState, useEffect } from 'react';
import { storage } from '@/utils/storage';
import { apiService } from '@/utils/api';
import { Package, Users, UserCheck, ArrowLeftRight } from 'lucide-react';

const BranchDashboard: React.FC = () => {
  const currentUser = storage.getCurrentUser();
  const branchId = currentUser?.branchId;
  
  const [medicines, setMedicines] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [dispensings, setDispensings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [branchId]);

  const fetchData = async () => {
    try {
      const [medicinesRes, employeesRes, patientsRes, dispensingsRes] = await Promise.all([
        apiService.getMedicines(branchId),
        apiService.getEmployees(branchId),
        apiService.getPatients(branchId),
        apiService.getDispensings(branchId)
      ]);

      if (medicinesRes.data) setMedicines(medicinesRes.data);
      if (employeesRes.data) setEmployees(employeesRes.data);
      if (patientsRes.data) setPatients(patientsRes.data);
      if (dispensingsRes.data) setDispensings(dispensingsRes.data);
    } catch (error) {
      console.error('Error fetching branch data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Загрузка...</div>;
  }

  const totalMedicines = medicines.reduce((sum, med) => sum + med.quantity, 0);
  const totalDispensed = dispensings.reduce((sum, disp) => sum + disp.quantity, 0);

  const stats = [
    {
      title: 'Лекарства в наличии',
      value: totalMedicines,
      icon: Package,
      color: 'bg-blue-500'
    },
    {
      title: 'Сотрудники',
      value: employees.length,
      icon: Users,
      color: 'bg-green-500'
    },
    {
      title: 'Пациенты',
      value: patients.length,
      icon: UserCheck,
      color: 'bg-purple-500'
    },
    {
      title: 'Выдано пациентам',
      value: totalDispensed,
      icon: ArrowLeftRight,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{currentUser?.branchName}</h1>
        <p className="text-gray-600 mt-2">Панель управления филиалом</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Лекарства в наличии</h3>
          {medicines.length > 0 ? (
            <div className="space-y-3">
              {medicines.slice(0, 5).map((medicine) => (
                <div key={medicine.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium">{medicine.name}</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    medicine.quantity > 10 ? 'bg-green-100 text-green-800' :
                    medicine.quantity > 0 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {medicine.quantity} шт.
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Лекарства не поступали</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Последние выдачи</h3>
          {dispensings.length > 0 ? (
            <div className="space-y-3">
              {dispensings.slice(-5).map((dispensing) => (
                <div key={dispensing.id} className="p-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{dispensing.medicine_name}</p>
                      <p className="text-sm text-gray-600">Пациент: {dispensing.patient_name}</p>
                    </div>
                    <span className="text-sm font-medium">{dispensing.quantity} шт.</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Выдачи не найдены</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchDashboard;
