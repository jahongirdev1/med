
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { storage } from '@/utils/storage';
import { apiService } from '@/utils/api';
import { toast } from '@/hooks/use-toast';
import { Users, Trash2, Phone, MapPin } from 'lucide-react';

const BranchEmployees: React.FC = () => {
  const currentUser = storage.getCurrentUser();
  const branchId = currentUser?.branchId;
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmployee, setNewEmployee] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, [branchId]);

  const fetchEmployees = async () => {
    try {
      const response = await apiService.getEmployees(branchId);
      if (response.data) {
        setEmployees(response.data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.firstName || !newEmployee.lastName || !newEmployee.phone || !newEmployee.address) {
      toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    try {
      const response = await apiService.createEmployee({
        first_name: newEmployee.firstName,
        last_name: newEmployee.lastName,
        phone: newEmployee.phone,
        address: newEmployee.address,
        branch_id: branchId
      });

      if (response.data) {
        setEmployees(prev => [...prev, response.data]);
        setNewEmployee({ firstName: '', lastName: '', phone: '', address: '' });
        toast({ title: 'Сотрудник добавлен успешно!' });
      } else {
        toast({ title: 'Ошибка', description: response.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось добавить сотрудника', variant: 'destructive' });
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этого сотрудника?')) {
      try {
        const response = await apiService.deleteEmployee(id);
        if (!response.error) {
          setEmployees(prev => prev.filter(e => e.id !== id));
          toast({ title: 'Сотрудник удален' });
        } else {
          toast({ title: 'Ошибка', description: response.error, variant: 'destructive' });
        }
      } catch (error) {
        toast({ title: 'Ошибка', description: 'Не удалось удалить сотрудника', variant: 'destructive' });
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Загрузка...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Сотрудники</h1>
        <p className="text-gray-600 mt-2">Управление сотрудниками филиала</p>
      </div>

      {/* Add new employee */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Добавить нового сотрудника</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="firstName">Имя</Label>
            <Input
              id="firstName"
              value={newEmployee.firstName}
              onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })}
              placeholder="Введите имя"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Фамилия</Label>
            <Input
              id="lastName"
              value={newEmployee.lastName}
              onChange={(e) => setNewEmployee({ ...newEmployee, lastName: e.target.value })}
              placeholder="Введите фамилию"
            />
          </div>
          <div>
            <Label htmlFor="phone">Номер телефона</Label>
            <Input
              id="phone"
              value={newEmployee.phone}
              onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
              placeholder="+7 (999) 123-45-67"
            />
          </div>
          <div>
            <Label htmlFor="address">Адрес</Label>
            <Input
              id="address"
              value={newEmployee.address}
              onChange={(e) => setNewEmployee({ ...newEmployee, address: e.target.value })}
              placeholder="Введите адрес"
            />
          </div>
        </div>
        <Button onClick={handleAddEmployee}>Сохранить сотрудника</Button>
      </div>

      {/* Employees list */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Список сотрудников</h2>
        </div>
        <div className="p-6">
          {employees.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map((employee) => (
                <div key={employee.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start">
                      <Users className="h-6 w-6 text-blue-500 mr-3 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {employee.first_name} {employee.last_name}
                        </h3>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteEmployee(employee.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {employee.phone}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      {employee.address}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Сотрудники не добавлены</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchEmployees;
