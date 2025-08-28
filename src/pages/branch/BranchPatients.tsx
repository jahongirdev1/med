
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { storage } from '@/utils/storage';
import { apiService } from '@/utils/api';
import { toast } from '@/hooks/use-toast';
import { UserCheck, Trash2, Phone, MapPin, Heart } from 'lucide-react';

const BranchPatients: React.FC = () => {
  const currentUser = storage.getCurrentUser();
  const branchId = currentUser?.branchId;
  
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPatient, setNewPatient] = useState({
    firstName: '',
    lastName: '',
    illness: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchPatients();
  }, [branchId]);

  const fetchPatients = async () => {
    try {
      const response = await apiService.getPatients(branchId);
      if (response.data) {
        setPatients(response.data);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatient = async () => {
    if (!newPatient.firstName || !newPatient.lastName || !newPatient.illness || !newPatient.phone || !newPatient.address) {
      toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    try {
      const response = await apiService.createPatient({
        first_name: newPatient.firstName,
        last_name: newPatient.lastName,
        illness: newPatient.illness,
        phone: newPatient.phone,
        address: newPatient.address,
        branch_id: branchId
      });

      if (response.data) {
        setPatients(prev => [...prev, response.data]);
        setNewPatient({ firstName: '', lastName: '', illness: '', phone: '', address: '' });
        toast({ title: 'Пациент добавлен успешно!' });
      } else {
        toast({ title: 'Ошибка', description: response.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось добавить пациента', variant: 'destructive' });
    }
  };

  const handleDeletePatient = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этого пациента?')) {
      try {
        const response = await apiService.deletePatient(id);
        if (!response.error) {
          setPatients(prev => prev.filter(p => p.id !== id));
          toast({ title: 'Пациент удален' });
        } else {
          toast({ title: 'Ошибка', description: response.error, variant: 'destructive' });
        }
      } catch (error) {
        toast({ title: 'Ошибка', description: 'Не удалось удалить пациента', variant: 'destructive' });
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Загрузка...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Пациенты</h1>
        <p className="text-gray-600 mt-2">Управление пациентами филиала</p>
      </div>

      {/* Add new patient */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Добавить нового пациента</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <Label htmlFor="firstName">Имя</Label>
            <Input
              id="firstName"
              value={newPatient.firstName}
              onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })}
              placeholder="Введите имя"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Фамилия</Label>
            <Input
              id="lastName"
              value={newPatient.lastName}
              onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })}
              placeholder="Введите фамилию"
            />
          </div>
          <div>
            <Label htmlFor="illness">Диагноз</Label>
            <Input
              id="illness"
              value={newPatient.illness}
              onChange={(e) => setNewPatient({ ...newPatient, illness: e.target.value })}
              placeholder="Чем болеет"
            />
          </div>
          <div>
            <Label htmlFor="phone">Номер телефона</Label>
            <Input
              id="phone"
              value={newPatient.phone}
              onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
              placeholder="+7 (999) 123-45-67"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="address">Адрес</Label>
            <Input
              id="address"
              value={newPatient.address}
              onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
              placeholder="Введите адрес"
            />
          </div>
        </div>
        <Button onClick={handleAddPatient}>Сохранить пациента</Button>
      </div>

      {/* Patients list */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Список пациентов</h2>
        </div>
        <div className="p-6">
          {patients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patients.map((patient) => (
                <div key={patient.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start">
                      <UserCheck className="h-6 w-6 text-blue-500 mr-3 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {patient.first_name} {patient.last_name}
                        </h3>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePatient(patient.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Heart className="h-4 w-4 mr-2 text-red-500" />
                      <span className="font-medium">Диагноз:</span>
                      <span className="ml-1">{patient.illness}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {patient.phone}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      {patient.address}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Пациенты не добавлены</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchPatients;
