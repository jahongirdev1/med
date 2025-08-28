import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { apiService } from "@/utils/api";
import { Loader2, Plus, Edit2, Trash2, Package } from "lucide-react";

const MedicineCategories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await apiService.getCategories('medicine');
      if (response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить категории лекарств",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название категории",
        variant: "destructive",
      });
      return;
    }

    try {
      const categoryData = {
        name: formData.name,
        description: formData.description,
        type: 'medicine'
      };

      let response;
      if (editingCategory) {
        response = await apiService.updateCategory(editingCategory.id, categoryData);
      } else {
        response = await apiService.createCategoryNew(categoryData);
      }

      if (response.data) {
        await fetchCategories();
        setDialogOpen(false);
        setEditingCategory(null);
        setFormData({ name: '', description: '' });
        toast({
          title: editingCategory ? "Категория обновлена" : "Категория создана",
          description: `Категория ${formData.name} успешно ${editingCategory ? 'обновлена' : 'создана'}`,
        });
      }
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить категорию",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту категорию?')) return;
    try {
      const response = await apiService.deleteCategory(categoryId);
      if (response.data || !response.error) {
        await fetchCategories();
        toast({ title: "Категория удалена", description: "Категория успешно удалена" });
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({ title: "Ошибка", description: "Не удалось удалить категорию", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingCategory(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Категории лекарств</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить категорию
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Редактировать категорию' : 'Добавить новую категорию'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Название категории</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: От головной боли"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Описание категории..."
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingCategory ? 'Обновить' : 'Создать'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Отмена
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Нет категорий лекарств</p>
            <p className="text-sm text-muted-foreground">Создайте первую категорию для начала работы</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {category.name}
                </CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(category.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {category.description || 'Нет описания'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MedicineCategories;
