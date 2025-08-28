
import React, { useState, useEffect } from 'react';
import { apiService } from '@/utils/api';
import { Package, Building2, Users, UserCheck } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [branches, setBranches] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [branchesRes, medicinesRes, employeesRes, transfersRes] = await Promise.all([
        apiService.getBranches(),
        apiService.getMedicines(),
        apiService.getEmployees(),
        apiService.getTransfers(),
      ]);

      if (branchesRes.data) setBranches(branchesRes.data);
      if (medicinesRes.data) setMedicines(medicinesRes.data);
      if (employeesRes.data) setEmployees(employeesRes.data.filter(e => !e.branch_id));
      if (transfersRes.data) setTransfers(transfersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Загрузка...</div>;
  }

  const totalMedicines = medicines.reduce((sum, med) => sum + med.quantity, 0);
  const totalTransferred = transfers.reduce((sum, transfer) => sum + transfer.quantity, 0);

  const stats = [
    {
      title: 'Филиалы',
      value: branches.length,
      icon: Building2,
      color: 'bg-blue-500'
    },
    {
      title: 'Лекарства на складе',
      value: totalMedicines,
      icon: Package,
      color: 'bg-green-500'
    },
    {
      title: 'Сотрудники',
      value: employees.length,
      icon: Users,
      color: 'bg-purple-500'
    },
    {
      title: 'Отправлено в филиалы',
      value: totalTransferred,
      icon: UserCheck,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Главный склад</h1>
        <p className="text-gray-600 mt-2">Панель управления складской системой</p>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Последние филиалы</h3>
          {branches.length > 0 ? (
            <div className="space-y-3">
              {branches.slice(-5).map((branch) => (
                <div key={branch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium">{branch.name}</span>
                  <span className="text-sm text-gray-500">Логин: {branch.login}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Филиалы не добавлены</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Лекарства на складе</h3>
          {medicines.length > 0 ? (
            <div className="space-y-3">
              {medicines.slice(0, 5).map((medicine) => (
                <div key={medicine.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{medicine.name}</span>
                    <p className="text-sm text-gray-500">
                      Цена: {medicine.purchase_price}₸ / {medicine.sell_price}₸
                    </p>
                  </div>
                  <span className="text-sm font-medium">{medicine.quantity} шт.</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Лекарства не добавлены</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
