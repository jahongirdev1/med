import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/utils/api';
import { Plus, Edit, Trash2, Package } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  category_id: string;
  purchase_price: number;
  quantity: number;
}

interface Category {
  id: string;
  name: string;
}

const AdminMedicalDevices: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: '',
    category_id: '',
    purchase_price: 0,
    quantity: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const [devicesResult, categoriesResult] = await Promise.all([
        apiService.getMedicalDevices(),
        apiService.getMedicalDeviceCategories(),
      ]);
      if (devicesResult.data) setDevices(devicesResult.data as Device[]);
      if (categoriesResult.data) setCategories(categoriesResult.data as Category[]);
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось загрузить данные", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDevice = async () => {
    if (!newDevice.name || !newDevice.category_id || !newDevice.purchase_price || !newDevice.quantity) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все поля и выберите категорию',
        variant: 'destructive'
      });
      return;
    }
    try {
      const payload = { ...newDevice, sell_price: 0 };
      const result = await apiService.createMedicalDevice(payload);
      if (result.data) {
        setDevices([...devices, result.data as Device]);
        setNewDevice({ name: '', category_id: '', purchase_price: 0, quantity: 0 });
        setIsCreateDialogOpen(false);
        toast({ title: 'Успешно', description: 'ИМН создано' });
      } else {
        toast({ title: 'Ошибка', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось создать ИМН', variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Загрузка...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Изделия медицинского назначения</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Добавить ИМН</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Создать новое ИМН</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Название</Label>
                <Input value={newDevice.name} onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })} />
              </div>
              <div>
                <Label>Категория</Label>
                <Select value={newDevice.category_id} onValueChange={(value) => setNewDevice({ ...newDevice, category_id: value })}>
                  <SelectTrigger><SelectValue placeholder="Выберите категорию" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Цена закупки</Label>
                <Input type="number" value={newDevice.purchase_price} onChange={(e) => setNewDevice({ ...newDevice, purchase_price: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Количество</Label>
                <Input type="number" value={newDevice.quantity} onChange={(e) => setNewDevice({ ...newDevice, quantity: Number(e.target.value) })} />
              </div>
              <Button onClick={handleCreateDevice} className="w-full">Создать ИМН</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Список ИМН ({devices.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Количество</TableHead>
                  <TableHead>Цена закупки</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>{device.name}</TableCell>
                  <TableCell>{device.quantity}</TableCell>
                  <TableCell>{device.purchase_price}₸</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {devices.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">ИМН не добавлены</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMedicalDevices;