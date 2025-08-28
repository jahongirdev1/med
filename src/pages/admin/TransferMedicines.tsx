
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { apiService } from '@/utils/api';
import { toast } from '@/hooks/use-toast';
import { Package, Plus, Trash2, Send } from 'lucide-react';

const TransferMedicines: React.FC = () => {
  const navigate = useNavigate();
  const { branchId } = useParams();
  const [branch, setBranch] = useState<any>(null);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedicines, setSelectedMedicines] = useState<Array<{medicineId: string, quantity: number}>>([]);

  useEffect(() => {
    fetchData();
  }, [branchId]);

  const fetchData = async () => {
    try {
      const [branchesRes, medicinesRes] = await Promise.all([
        apiService.getBranches(),
        apiService.getMedicines()
      ]);

      if (branchesRes.data) {
        const foundBranch = branchesRes.data.find(b => b.id === branchId);
        setBranch(foundBranch);
      }

      if (medicinesRes.data) {
        setMedicines(medicinesRes.data.filter(m => !m.branch_id && m.quantity > 0));
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить данные', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const addMedicine = () => {
    setSelectedMedicines([...selectedMedicines, { medicineId: '', quantity: 1 }]);
  };

  const updateMedicine = (index: number, medicineId: string, quantity: number) => {
    const updated = [...selectedMedicines];
    updated[index] = { medicineId, quantity };
    setSelectedMedicines(updated);
  };

  const removeMedicine = (index: number) => {
    setSelectedMedicines(selectedMedicines.filter((_, i) => i !== index));
  };

  const handleTransfer = async () => {
    if (selectedMedicines.length === 0) {
      toast({ title: 'Ошибка', description: 'Выберите лекарства для отправки', variant: 'destructive' });
      return;
    }

    // Validate medicines
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

    try {
      // Create transfer records
      const transfers = selectedMedicines.map(selected => {
        const medicine = medicines.find(m => m.id === selected.medicineId);
        return {
          medicine_id: selected.medicineId,
          medicine_name: medicine?.name || '',
          quantity: selected.quantity,
          from_branch_id: null, // main warehouse
          to_branch_id: branchId
        };
      });

      const response = await apiService.createTransfers(transfers);
      
      if (!response.error) {
        toast({ 
          title: 'Лекарства отправлены!', 
          description: `Отправлено ${selectedMedicines.length} препаратов в ${branch?.name}` 
        });
        navigate('/admin/branches');
      } else {
        toast({ title: 'Ошибка', description: response.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось отправить лекарства', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Загрузка...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Отправка лекарств</h1>
        <p className="text-gray-600 mt-2">Отправка лекарств в филиал: {branch?.name}</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Выберите лекарства для отправки</h2>
          <Button onClick={addMedicine} className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Добавить лекарство
          </Button>
        </div>

        {selectedMedicines.length > 0 ? (
          <div className="space-y-4 mb-6">
            {selectedMedicines.map((selected, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label>Лекарство</Label>
                  <Select 
                    value={selected.medicineId} 
                    onValueChange={(value) => updateMedicine(index, value, selected.quantity)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите лекарство" />
                    </SelectTrigger>
                    <SelectContent>
                      {medicines.map((medicine) => (
                        <SelectItem key={medicine.id} value={medicine.id}>
                          {medicine.name} (доступно: {medicine.quantity} шт.)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Количество</Label>
                  <Input
                    type="number"
                    min="1"
                    value={selected.quantity}
                    onChange={(e) => updateMedicine(index, selected.medicineId, Number(e.target.value))}
                    placeholder="Количество"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="destructive" 
                    onClick={() => removeMedicine(index)}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p>Нажмите "Добавить лекарство" чтобы начать</p>
          </div>
        )}

        <div className="flex gap-4">
          <Button onClick={handleTransfer} disabled={selectedMedicines.length === 0}>
            <Send className="h-4 w-4 mr-2" />
            Отправить лекарства
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/branches')}>
            Отмена
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TransferMedicines;
