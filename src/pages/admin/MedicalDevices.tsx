import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NumberInput from '@/components/number-input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiService } from '@/utils/api';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';

const AdminMedicalDevices: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    purchasePrice: '0',
    quantity: '0',
    branchId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [devRes, catRes] = await Promise.all([
        apiService.getMedicalDevices(),
        apiService.getMedicalDeviceCategories(),
      ]);
      if (devRes.data) setDevices(devRes.data.filter((d: any) => !d.branch_id));
      if (catRes.data) setCategories(catRes.data);
    } catch (e) {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить данные', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', categoryId: '', purchasePrice: '0', quantity: '0', branchId: '' });
    setEditingDevice(null);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.categoryId || !formData.purchasePrice || !formData.quantity) {
      toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    const payload = {
      name: formData.name,
      category_id: formData.categoryId,
      purchase_price: parseFloat(formData.purchasePrice),
      quantity: parseInt(formData.quantity),
      branch_id: formData.branchId || null,
    };

    try {
      if (editingDevice) {
        const res = await apiService.updateMedicalDevice(editingDevice.id, payload);
        if (!res.error) {
          setDevices((prev) => prev.map((d) => (d.id === editingDevice.id ? { ...d, ...payload, id: editingDevice.id } : d)));
          toast({ title: 'ИМН обновлено' });
        } else {
          toast({ title: 'Ошибка', description: res.error, variant: 'destructive' });
          return;
        }
      } else {
        const res = await apiService.createMedicalDevice(payload);
        if (res.data) {
          setDevices((prev) => [...prev, res.data]);
          toast({ title: 'ИМН добавлено' });
        } else {
          toast({ title: 'Ошибка', description: res.error, variant: 'destructive' });
          return;
        }
      }
      setDialogOpen(false);
      resetForm();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось сохранить', variant: 'destructive' });
    }
  };

  const handleEdit = (device: any) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      categoryId: device.category_id,
      purchasePrice: device.purchase_price.toString(),
      quantity: device.quantity.toString(),
      branchId: device.branch_id || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить это ИМН?')) return;
    try {
      const res = await apiService.deleteMedicalDevice(id);
      if (!res.error) {
        setDevices((prev) => prev.filter((d) => d.id !== id));
        toast({ title: 'ИМН удалено' });
      } else {
        toast({ title: 'Ошибка', description: res.error, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Ошибка', description: 'Не удалось удалить', variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Загрузка...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ИМН</h1>
          <p className="text-gray-600 mt-2">Управление изделиями медицинского назначения</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Добавить ИМН</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDevice ? 'Редактировать ИМН' : 'Добавить ИМН'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Название</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <Label>Категория</Label>
                <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Цена закупки</Label>
                <NumberInput allowDecimal value={formData.purchasePrice} onValueChange={(v) => setFormData({ ...formData, purchasePrice: v })} />
              </div>
              <div>
                <Label>Количество</Label>
                <NumberInput value={formData.quantity} onValueChange={(v) => setFormData({ ...formData, quantity: v })} />
              </div>
              <div>
                <Label>ID филиала (опционально)</Label>
                <Input value={formData.branchId} onChange={(e) => setFormData({ ...formData, branchId: e.target.value })} />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleSubmit} className="flex-1">{editingDevice ? 'Обновить' : 'Добавить'}</Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Отмена</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цена закупки</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цена продажи</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Количество</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {devices.map((device) => (
                <tr key={device.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{device.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{device.purchase_price} ₸</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{device.sell_price} ₸</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{device.quantity} шт.</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(device)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(device.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {devices.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">ИМН не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMedicalDevices;
