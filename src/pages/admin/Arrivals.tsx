import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { NumberInput } from '@/components/NumberInput';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { apiService } from '@/utils/api';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Save } from 'lucide-react';

interface ArrivalItem {
  itemId: string;
  quantity: string;
  purchasePrice: string;
}

const AdminArrivals: React.FC = () => {
  const [tab, setTab] = useState<'medicine' | 'device'>('medicine');
  const [medicines, setMedicines] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [medicineArrivals, setMedicineArrivals] = useState<ArrivalItem[]>([]);
  const [deviceArrivals, setDeviceArrivals] = useState<ArrivalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [medRes, devRes] = await Promise.all([
        apiService.getMedicines(),
        apiService.getMedicalDevices(),
      ]);
      if (medRes.data) setMedicines(medRes.data.filter((m) => !m.branch_id));
      if (devRes.data) setDevices(devRes.data.filter((d) => !d.branch_id));
    } catch (e) {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить товары', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const addArrival = (type: 'medicine' | 'device') => {
    const item: ArrivalItem = { itemId: '', quantity: '0', purchasePrice: '0' };
    type === 'medicine'
      ? setMedicineArrivals([...medicineArrivals, item])
      : setDeviceArrivals([...deviceArrivals, item]);
  };

  const updateArrival = (
    type: 'medicine' | 'device',
    index: number,
    field: keyof ArrivalItem,
    value: string,
  ) => {
    const list = type === 'medicine' ? [...medicineArrivals] : [...deviceArrivals];
    list[index] = { ...list[index], [field]: value };
    type === 'medicine' ? setMedicineArrivals(list) : setDeviceArrivals(list);
  };

  const removeArrival = (type: 'medicine' | 'device', index: number) => {
    const list = type === 'medicine' ? medicineArrivals : deviceArrivals;
    const filtered = list.filter((_, i) => i !== index);
    type === 'medicine' ? setMedicineArrivals(filtered) : setDeviceArrivals(filtered);
  };

  const groupArrivals = (arrivals: ArrivalItem[], items: any[], key: 'medicine' | 'device') => {
    const grouped: Record<string, any> = {};
    for (const arr of arrivals) {
      const item = items.find((i) => i.id === arr.itemId);
      if (!grouped[arr.itemId]) {
        grouped[arr.itemId] = {
          [`${key}_id`]: arr.itemId,
          [`${key}_name`]: item?.name || '',
          quantity: 0,
          purchase_price: 0,
        };
      }
      grouped[arr.itemId].quantity += Number(arr.quantity);
      grouped[arr.itemId].purchase_price = Number(arr.purchasePrice);
    }
    return Object.values(grouped);
  };

  const handleSaveMedicines = async () => {
    if (medicineArrivals.length === 0) {
      toast({ title: 'Ошибка', description: 'Добавьте поступления', variant: 'destructive' });
      return;
    }
    try {
      const data = groupArrivals(medicineArrivals, medicines, 'medicine');
      const res = await apiService.createArrivals(data);
      if (!res.error) {
        setMedicineArrivals([]);
        fetchData();
        toast({ title: 'Поступления сохранены!' });
      } else {
        toast({ title: 'Ошибка', description: res.error, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Ошибка', description: 'Не удалось сохранить', variant: 'destructive' });
    }
  };

  const handleSaveDevices = async () => {
    if (deviceArrivals.length === 0) {
      toast({ title: 'Ошибка', description: 'Добавьте поступления', variant: 'destructive' });
      return;
    }
    try {
      const data = groupArrivals(deviceArrivals, devices, 'device');
      const res = await apiService.createDeviceArrivals(data);
      if (!res.error) {
        setDeviceArrivals([]);
        fetchData();
        toast({ title: 'Поступления сохранены!' });
      } else {
        toast({ title: 'Ошибка', description: res.error, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Ошибка', description: 'Не удалось сохранить', variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Загрузка...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Поступления на склад</h1>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="medicine">Лекарства</TabsTrigger>
          <TabsTrigger value="device">ИМН</TabsTrigger>
        </TabsList>

        <TabsContent value="medicine">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Добавить поступления</h2>
              <Button onClick={() => addArrival('medicine')} className="flex items-center">
                <Plus className="h-4 w-4 mr-2" /> Добавить
              </Button>
            </div>
            {medicineArrivals.map((arrival, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                <div>
                  <Label>Лекарство</Label>
                  <Select value={arrival.itemId} onValueChange={(v) => updateArrival('medicine', index, 'itemId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите лекарство" />
                    </SelectTrigger>
                    <SelectContent>
                      {medicines.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Количество</Label>
                  <NumberInput value={arrival.quantity} onChange={(v) => updateArrival('medicine', index, 'quantity', v)} />
                </div>
                <div>
                  <Label>Цена закупки</Label>
                  <NumberInput decimal value={arrival.purchasePrice} onChange={(v) => updateArrival('medicine', index, 'purchasePrice', v)} />
                </div>
                <div className="flex items-end">
                  <Button variant="destructive" onClick={() => removeArrival('medicine', index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {medicineArrivals.length > 0 && (
              <Button onClick={handleSaveMedicines} className="mt-4">
                <Save className="h-4 w-4 mr-2" />Сохранить
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="device">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Добавить поступления</h2>
              <Button onClick={() => addArrival('device')} className="flex items-center">
                <Plus className="h-4 w-4 mr-2" /> Добавить
              </Button>
            </div>
            {deviceArrivals.map((arrival, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                <div>
                  <Label>ИМН</Label>
                  <Select value={arrival.itemId} onValueChange={(v) => updateArrival('device', index, 'itemId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите ИМН" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Количество</Label>
                  <NumberInput value={arrival.quantity} onChange={(v) => updateArrival('device', index, 'quantity', v)} />
                </div>
                <div>
                  <Label>Цена закупки</Label>
                  <NumberInput decimal value={arrival.purchasePrice} onChange={(v) => updateArrival('device', index, 'purchasePrice', v)} />
                </div>
                <div className="flex items-end">
                  <Button variant="destructive" onClick={() => removeArrival('device', index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {deviceArrivals.length > 0 && (
              <Button onClick={handleSaveDevices} className="mt-4">
                <Save className="h-4 w-4 mr-2" />Сохранить
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminArrivals;
