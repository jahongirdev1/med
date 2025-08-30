import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/NumberInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { apiService } from '@/utils/api';
import { storage } from '@/utils/storage';
import { Package, Plus, Edit, Trash2 } from 'lucide-react';

const BranchMedicines: React.FC = () => {
  const currentUser = storage.getCurrentUser();
  const branchId = currentUser?.branchId;
  
  const [medicines, setMedicines] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    purchase_price: '0',
    sell_price: 0,
    quantity: '0'
  });
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null);
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [branchId]);

  const fetchData = async () => {
    try {
      const [medicinesRes, categoriesRes] = await Promise.all([
        apiService.getMedicines(branchId),
        apiService.getCategories()
      ]);

      if (medicinesRes.data) setMedicines(medicinesRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data.filter(c => c.type === 'medicine'));
    } catch (error) {
      console.error('Error fetching medicines data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.category_id) {
      toast({ title: 'Ошибка', description: 'Заполните все обязательные поля', variant: 'destructive' });
      return;
    }

    try {
      const medicineData = {
        name: formData.name,
        category_id: formData.category_id,
        purchase_price: parseFloat(formData.purchase_price),
        sell_price: formData.sell_price,
        quantity: parseInt(formData.quantity),
        branch_id: branchId
      };

      const response = await apiService.createMedicine(medicineData);
      
      if (!response.error) {
        toast({ title: 'Лекарство добавлено!' });
        resetForm();
        setCreateDialogOpen(false);
        await fetchData();
      } else {
        toast({ title: 'Ошибка', description: response.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось добавить лекарство', variant: 'destructive' });
    }
  };

  const handleEdit = async () => {
    if (!formData.name || !formData.category_id) {
      toast({ title: 'Ошибка', description: 'Заполните все обязательные поля', variant: 'destructive' });
      return;
    }
    try {
      const updateData = {
        name: formData.name,
        category_id: formData.category_id,
        purchase_price: parseFloat(formData.purchase_price),
        sell_price: formData.sell_price,
        quantity: parseInt(formData.quantity),
        branch_id: branchId
      };
      const response = await apiService.updateMedicine(editingMedicine.id, updateData);

      if (!response.error) {
        toast({ title: 'Лекарство обновлено!' });
        resetForm();
        setEditDialogOpen(false);
        setEditingMedicine(null);
        await fetchData();
      } else {
        toast({ title: 'Ошибка', description: response.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось обновить лекарство', variant: 'destructive' });
    }
  };

  const handleDelete = async (medicineId: string) => {
    if (!confirm('Вы уверены, что хотите удалить это лекарство?')) return;

    try {
      const response = await apiService.deleteMedicine(medicineId);
      
      if (!response.error) {
        toast({ title: 'Лекарство удалено!' });
        await fetchData();
      } else {
        toast({ title: 'Ошибка', description: response.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось удалить лекарство', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category_id: '',
      purchase_price: '0',
      sell_price: 0,
      quantity: '0'
    });
  };

  const openEditDialog = (medicine: any) => {
    setEditingMedicine(medicine);
    setFormData({
      name: medicine.name,
      category_id: medicine.category_id,
      purchase_price: medicine.purchase_price.toString(),
      sell_price: medicine.sell_price,
      quantity: medicine.quantity.toString()
    });
    setEditDialogOpen(true);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Неизвестная категория';
  };

  const handleRowClick = async (medicine: any) => {
    setSelectedMedicine(medicine);
    try {
      const res = await apiService.getLastMedicineReceipt(branchId, medicine.id);
      setLastReceipt(res.data);
    } catch {
      setLastReceipt(null);
    }
    setReceiptDialogOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Лекарства</h1>
          <p className="text-muted-foreground">Управление лекарствами филиала</p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить лекарство
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить новое лекарство</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Название</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Введите название лекарства"
                />
              </div>

              <div>
                <Label>Категория</Label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">Выберите категорию</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Закупочная цена</Label>
                  <NumberInput
                    decimal
                    value={formData.purchase_price}
                    onChange={(v) => setFormData({ ...formData, purchase_price: v })}
                  />
                </div>
                <div>
                  <Label>Цена продажи</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.sell_price}
                    onChange={(e) => setFormData({...formData, sell_price: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <Label>Количество</Label>
                <NumberInput
                  value={formData.quantity}
                  onChange={(v) => setFormData({ ...formData, quantity: v })}
                />
              </div>
              
              <Button onClick={handleCreate} className="w-full">
                Добавить лекарство
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Список лекарств ({medicines.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {medicines.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Закупочная цена</TableHead>
                  <TableHead>Цена продажи</TableHead>
                  <TableHead>Количество</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medicines.map((medicine) => (
                  <TableRow key={medicine.id} onClick={() => handleRowClick(medicine)} className="cursor-pointer">
                    <TableCell className="font-medium">{medicine.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryName(medicine.category_id)}</Badge>
                    </TableCell>
                    <TableCell>{medicine.purchase_price} ₸</TableCell>
                    <TableCell>{medicine.sell_price} ₸</TableCell>
                    <TableCell>
                      <Badge variant={medicine.quantity > 0 ? "default" : "destructive"}>
                        {medicine.quantity} шт.
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEditDialog(medicine); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(medicine.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Нет лекарств в этом филиале</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать лекарство</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Название</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Введите название лекарства"
              />
            </div>

            <div>
              <Label>Категория</Label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="">Выберите категорию</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Закупочная цена</Label>
                <NumberInput
                  decimal
                  value={formData.purchase_price}
                  onChange={(v) => setFormData({ ...formData, purchase_price: v })}
                />
              </div>
              <div>
                <Label>Цена продажи</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.sell_price}
                  onChange={(e) => setFormData({...formData, sell_price: Number(e.target.value)})}
                />
              </div>
            </div>

            <div>
              <Label>Количество</Label>
              <NumberInput
                value={formData.quantity}
                onChange={(v) => setFormData({ ...formData, quantity: v })}
              />
            </div>
            
            <Button onClick={handleEdit} className="w-full">
              Обновить лекарство
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Последнее поступление</DialogTitle>
          </DialogHeader>
          {lastReceipt ? (
            <div className="space-y-2">
              <p>Количество: {lastReceipt.quantity}</p>
              <p>Время: {new Date(lastReceipt.time).toLocaleString()}</p>
            </div>
          ) : (
            <p>Данных нет</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BranchMedicines;