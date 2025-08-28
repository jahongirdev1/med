
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiService } from '@/utils/api';
import { toast } from '@/hooks/use-toast';
import { Users, Trash2, Phone, MapPin } from 'lucide-react';

const AdminEmployees: React.FC = () => {
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
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await apiService.getEmployees();
      if (response.data) {
        setEmployees(response.data.filter(e => !e.branch_id));
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить сотрудников', variant: 'destructive' });
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
        branch_id: null
      });

      if (response.data) {
        setEmployees(prev => [...prev, response.data]);
        setNewEmployee({ firstName: '', lastName: '', phone: '', address: '' });
        toast({ title: 'Сотрудник добавлен успешно!' });
      } else {
        toast({ title: 'Ошибка', description: response.error || 'Не удалось добавить сотрудника', variant: 'destructive' });
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
        <h1 className="text-3xl font-bold text-gray-900">Сотрудники главного склада</h1>
        <p className="text-gray-600 mt-2">Управление сотрудниками главного склада</p>
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
            <div className="space-y-4">
              {employees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-500 mr-3" />
                    <div>
                      <h3 className="font-semibold">{employee.first_name} {employee.last_name}</h3>
                      <p className="text-sm text-gray-600">Тел: {employee.phone}</p>
                      <p className="text-sm text-gray-600">Адрес: {employee.address}</p>
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

export default AdminEmployees;
