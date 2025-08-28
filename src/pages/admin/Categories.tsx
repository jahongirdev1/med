import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/utils/api';
import { Plus, FileText } from 'lucide-react';

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const result = await apiService.getMedicalDeviceCategories();
      if (result.data) setCategories(result.data);
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось загрузить категории", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    try {
      const result = await apiService.createMedicalDeviceCategory(newCategory);
      if (result.data) {
        setCategories([...categories, result.data]);
        setNewCategory({ name: '', description: '' });
        setIsCreateDialogOpen(false);
        toast({ title: "Успешно", description: "Категория создана" });
      }
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось создать категорию", variant: "destructive" });
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64">Загрузка...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Категории ИМН</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Добавить категорию</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Создать категорию</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Название</Label>
                <Input value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} />
              </div>
              <div>
                <Label>Описание</Label>
                <Input value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} />
              </div>
              <Button onClick={handleCreateCategory} className="w-full">Создать</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Категории ({categories.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Описание</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>{category.description || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {categories.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Категории не добавлены</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Categories;