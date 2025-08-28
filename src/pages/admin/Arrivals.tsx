
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
import { apiService } from '@/utils/api';
import { toast } from '@/hooks/use-toast';
import { Package, Plus, Trash2, Save } from 'lucide-react';

interface ArrivalItem {
  medicineId: string;
  quantity: number;
  purchasePrice: number;
  sellPrice: number;
}

const Arrivals: React.FC = () => {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [arrivals, setArrivals] = useState<ArrivalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      const response = await apiService.getMedicines();
      if (response.data && Array.isArray(response.data)) {
        setMedicines(response.data.filter(m => !m.branch_id));
      } else {
        setMedicines([]);
      }
    } catch (error) {
      console.error('Error fetching medicines:', error);
      setMedicines([]);
      toast({ title: 'Ошибка', description: 'Не удалось загрузить лекарства', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const addArrival = () => {
    setArrivals([...arrivals, { medicineId: '', quantity: 1, purchasePrice: 0, sellPrice: 0 }]);
  };

  const updateArrival = (index: number, field: keyof ArrivalItem, value: string | number) => {
    const updated = [...arrivals];
    updated[index] = { ...updated[index], [field]: value };
    setArrivals(updated);
  };

  const removeArrival = (index: number) => {
    setArrivals(arrivals.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (arrivals.length === 0) {
      toast({ title: 'Ошибка', description: 'Добавьте поступления', variant: 'destructive' });
      return;
    }

    // Validate arrivals
    for (const arrival of arrivals) {
      if (!arrival.medicineId || arrival.quantity <= 0 || arrival.purchasePrice <= 0 || arrival.sellPrice <= 0) {
        toast({ title: 'Ошибка', description: 'Заполните все поля корректно', variant: 'destructive' });
        return;
      }
    }

    try {
      console.log('Processing arrivals:', arrivals);
      
      // Группируем поступления по лекарствам и суммируем количества
      const groupedArrivals = arrivals.reduce((acc, arrival) => {
        const medicine = medicines.find(m => m.id === arrival.medicineId);
        const key = arrival.medicineId;
        
        if (!acc[key]) {
          acc[key] = {
            medicine_id: arrival.medicineId,
            medicine_name: medicine?.name || '',
            quantity: 0,
            purchase_price: arrival.purchasePrice,
            sell_price: arrival.sellPrice
          };
        }
        
        // Суммируем количества для одного и того же лекарства
        acc[key].quantity += arrival.quantity;
        
        // Обновляем цены (используем последние введенные)
        acc[key].purchase_price = arrival.purchasePrice;
        acc[key].sell_price = arrival.sellPrice;
        
        return acc;
      }, {} as Record<string, any>);

      const arrivalData = Object.values(groupedArrivals);

      console.log('Grouped arrival data:', arrivalData);
      console.log('Отправляем данные поступлений:', arrivalData);

      const response = await apiService.createArrivals(arrivalData);
      
      if (!response.error) {
        setArrivals([]);
        await fetchMedicines(); // Обновляем список лекарств
        toast({ 
          title: 'Поступления сохранены!', 
          description: `Обработано ${arrivalData.length} уникальных лекарств с общим количеством ${arrivalData.reduce((sum, item) => sum + item.quantity, 0)} шт.` 
        });
      } else {
        toast({ title: 'Ошибка', description: response.error, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error saving arrivals:', error);
      toast({ title: 'Ошибка', description: 'Не удалось сохранить поступления', variant: 'destructive' });
    }
  };

  // Функция для получения количества добавленного лекарства
  const getAddedQuantity = (medicineId: string) => {
    return arrivals
      .filter(arrival => arrival.medicineId === medicineId)
      .reduce((sum, arrival) => sum + arrival.quantity, 0);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Загрузка...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Поступления на склад</h1>
        <p className="text-gray-600 mt-2">Добавление поступивших лекарств на главный склад</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Добавить поступления</h2>
          <Button onClick={addArrival} className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Добавить поступление
          </Button>
        </div>

        {arrivals.length > 0 ? (
          <div className="space-y-4 mb-6">
            {arrivals.map((arrival, index) => {
              const medicine = medicines.find(m => m.id === arrival.medicineId);
              const addedQuantity = getAddedQuantity(arrival.medicineId);
              
              return (
                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label>Лекарство</Label>
                    <Select 
                      value={arrival.medicineId} 
                      onValueChange={(value) => updateArrival(index, 'medicineId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите лекарство" />
                      </SelectTrigger>
                      <SelectContent>
                        {medicines.map((medicine) => {
                          const willAdd = getAddedQuantity(medicine.id);
                          return (
                            <SelectItem key={medicine.id} value={medicine.id}>
                              {medicine.name} (текущее: {medicine.quantity || 0}{willAdd > 0 ? ` + ${willAdd}` : ''} шт.)
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {medicine && addedQuantity > 0 && (
                      <p className="text-xs text-blue-600 mt-1">
                        Добавляется всего: {addedQuantity} шт.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Количество</Label>
                    <Input
                      type="number"
                      min="1"
                      value={arrival.quantity}
                      onChange={(e) => updateArrival(index, 'quantity', Number(e.target.value))}
                      placeholder="Количество"
                    />
                  </div>
                  <div>
                    <Label>Цена приходная (₸)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={arrival.purchasePrice}
                      onChange={(e) => updateArrival(index, 'purchasePrice', Number(e.target.value))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Цена продажная (₸)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={arrival.sellPrice}
                      onChange={(e) => updateArrival(index, 'sellPrice', Number(e.target.value))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      variant="destructive" 
                      onClick={() => removeArrival(index)}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Удалить
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p>Нажмите "Добавить поступление" чтобы начать</p>
          </div>
        )}

        {arrivals.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Примечание:</strong> Если выбрано одно и то же лекарство несколько раз, 
              количества будут автоматически суммированы при сохранении.
            </p>
            
            {/* Показываем итоговую группировку */}
            {(() => {
              const grouped = arrivals.reduce((acc, arrival) => {
                const medicine = medicines.find(m => m.id === arrival.medicineId);
                const key = arrival.medicineId;
                
                if (medicine && !acc[key]) {
                  acc[key] = {
                    name: medicine.name,
                    totalQuantity: 0,
                    count: 0
                  };
                }
                
                if (acc[key]) {
                  acc[key].totalQuantity += arrival.quantity;
                  acc[key].count += 1;
                }
                
                return acc;
              }, {} as Record<string, { name: string; totalQuantity: number; count: number }>);

              const groupedItems = Object.values(grouped).filter(item => item.totalQuantity > 0);
              
              if (groupedItems.length > 0) {
                return (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-blue-900 mb-2">Итого будет добавлено:</p>
                    <div className="space-y-1">
                      {groupedItems.map((item, index) => (
                        <p key={index} className="text-xs text-blue-700">
                          • {item.name}: {item.totalQuantity} шт.
                          {item.count > 1 && ` (из ${item.count} записей)`}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}

        <Button onClick={handleSave} disabled={arrivals.length === 0}>
          <Save className="h-4 w-4 mr-2" />
          Сохранить поступления
        </Button>
      </div>
    </div>
  );
};

export default Arrivals;
