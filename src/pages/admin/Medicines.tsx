
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { apiService } from '@/utils/api';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Medicines: React.FC = () => {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    purchasePrice: '',
    quantity: '',
    categoryId: ''
  });

  useEffect(() => {
    fetchMedicines();
    fetchCategories();
  }, []);

  const [categories, setCategories] = useState<any[]>([]);

  const fetchMedicines = async () => {
    try {
      const response = await apiService.getMedicines();
      if (response.data) {
        setMedicines(response.data.filter(m => !m.branch_id));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiService.getCategories('medicine');
      if (res.data) setCategories(res.data);
    } catch (e) {
      // ignore
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      purchasePrice: '',
      quantity: '',
      categoryId: ''
    });
    setEditingMedicine(null);
  };

  const handleSubmit = async () => {
    if (!formData.categoryId) {
      toast({ title: 'Ошибка', description: 'Пожалуйста, выберите категорию', variant: 'destructive' });
      return;
    }
    if (!formData.name || !formData.purchasePrice || !formData.quantity) {
      toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    const medicineData = {
      name: formData.name,
      purchase_price: parseFloat(formData.purchasePrice),
      sell_price: 0,
      quantity: parseInt(formData.quantity),
      branch_id: null,
      category_id: formData.categoryId
    };

    try {
      if (editingMedicine) {
        const response = await apiService.updateMedicine(editingMedicine.id, medicineData);
        if (!response.error) {
          setMedicines(prev => prev.map(m => 
            m.id === editingMedicine.id ? { ...medicineData, id: editingMedicine.id } : m
          ));
          toast({ title: 'Лекарство обновлено' });
        } else {
          toast({ title: 'Ошибка', description: response.error, variant: 'destructive' });
        }
      } else {
        const response = await apiService.createMedicine(medicineData);
        if (response.data) {
          setMedicines(prev => [...prev, response.data]);
          toast({ title: 'Лекарство добавлено' });
        } else {
          toast({ title: 'Ошибка', description: response.error, variant: 'destructive' });
        }
      }

      setShowAddDialog(false);
      resetForm();
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error?.message || 'Не удалось сохранить лекарство', variant: 'destructive' });
    }
  };

  const handleEdit = (medicine: any) => {
    setEditingMedicine(medicine);
    setFormData({
      name: medicine.name,
      purchasePrice: medicine.purchase_price.toString(),
      quantity: medicine.quantity.toString(),
      categoryId: medicine.category_id || ''
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить это лекарство?')) {
      try {
        const response = await apiService.deleteMedicine(id);
        if (!response.error) {
          setMedicines(prev => prev.filter(m => m.id !== id));
          toast({ title: 'Лекарство удалено' });
        } else {
          toast({ title: 'Ошибка', description: response.error, variant: 'destructive' });
        }
      } catch (error) {
        toast({ title: 'Ошибка', description: 'Не удалось удалить лекарство', variant: 'destructive' });
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Загрузка...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Лекарства</h1>
          <p className="text-gray-600 mt-2">Управление лекарствами главного склада</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить лекарство
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMedicine ? 'Редактировать лекарство' : 'Добавить лекарство'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Название</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="purchasePrice">Цена закупки (₸)</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="quantity">Количество</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="category">Категория</Label>
                <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleSubmit} className="flex-1">
                  {editingMedicine ? 'Обновить' : 'Добавить'}
                </Button>
                <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                  Отмена
                </Button>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Название
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Цена закупки
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Количество
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {medicines.map((medicine) => (
                <tr key={medicine.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {medicine.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {medicine.purchase_price} ₸
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {medicine.quantity} шт.
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(medicine)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(medicine.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {medicines.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">Лекарства не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Medicines;
