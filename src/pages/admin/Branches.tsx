
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiService } from '@/utils/api';
import { toast } from '@/hooks/use-toast';
import { Trash2, Edit, Send, Building2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

const Branches: React.FC = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBranch, setNewBranch] = useState({ name: '', login: '', password: '' });
  const [editingBranch, setEditingBranch] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [branchesRes, medicinesRes] = await Promise.all([
        apiService.getBranches(),
        apiService.getMedicines()
      ]);
      
      if (branchesRes.data) setBranches(branchesRes.data);
      if (medicinesRes.data) setMedicines(medicinesRes.data.filter(m => !m.branch_id));
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить данные', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBranch = async () => {
    if (!newBranch.name || !newBranch.login || !newBranch.password) {
      toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    try {
      const response = await apiService.createBranch({
        name: newBranch.name,
        login: newBranch.login,
        password: newBranch.password
      });

      if (response.data) {
        setBranches(prev => [...prev, response.data]);
        setNewBranch({ name: '', login: '', password: '' });
        toast({ title: 'Филиал добавлен успешно!' });
      } else {
        toast({ title: 'Ошибка', description: response.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось добавить филиал', variant: 'destructive' });
    }
  };

  const handleEditBranch = async () => {
    if (!editingBranch) return;

    try {
      const response = await apiService.updateBranch(editingBranch.id, {
        name: editingBranch.name,
        login: editingBranch.login,
        password: editingBranch.password
      });

      if (!response.error) {
        setBranches(prev => prev.map(b => b.id === editingBranch.id ? editingBranch : b));
        setEditingBranch(null);
        toast({ title: 'Филиал обновлен успешно!' });
      } else {
        toast({ title: 'Ошибка', description: response.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось обновить филиал', variant: 'destructive' });
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот филиал?')) {
      try {
        const response = await apiService.deleteBranch(id);
        if (!response.error) {
          setBranches(prev => prev.filter(b => b.id !== id));
          toast({ title: 'Филиал удален' });
        } else {
          toast({ title: 'Ошибка', description: response.error, variant: 'destructive' });
        }
      } catch (error) {
        toast({ title: 'Ошибка', description: 'Не удалось удалить филиал', variant: 'destructive' });
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Загрузка...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Управление филиалами</h1>
        <p className="text-gray-600 mt-2">Добавляйте, редактируйте и управляйте филиалами</p>
      </div>

      {/* Add new branch */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Добавить новый филиал</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <Label htmlFor="name">Название филиала</Label>
            <Input
              id="name"
              value={newBranch.name}
              onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
              placeholder="Введите название"
            />
          </div>
          <div>
            <Label htmlFor="login">Логин</Label>
            <Input
              id="login"
              value={newBranch.login}
              onChange={(e) => setNewBranch({ ...newBranch, login: e.target.value })}
              placeholder="Логин для входа"
            />
          </div>
          <div>
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              value={newBranch.password}
              onChange={(e) => setNewBranch({ ...newBranch, password: e.target.value })}
              placeholder="Пароль"
            />
          </div>
        </div>
        <Button onClick={handleAddBranch}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить филиал
        </Button>
      </div>

      {/* Branches list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((branch) => (
          <div key={branch.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Building2 className="h-6 w-6 text-blue-500 mr-2" />
                <h3 className="text-lg font-semibold">{branch.name}</h3>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingBranch(branch)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteBranch(branch.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p><strong>Логин:</strong> {branch.login}</p>
              <p><strong>Создан:</strong> {new Date(branch.created_at).toLocaleDateString('ru-RU')}</p>
            </div>

            <Button
              onClick={() => navigate(`/admin/transfer/${branch.id}`)}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Отправить лекарства
            </Button>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingBranch} onOpenChange={() => setEditingBranch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать филиал</DialogTitle>
          </DialogHeader>
          {editingBranch && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editName">Название филиала</Label>
                <Input
                  id="editName"
                  value={editingBranch.name}
                  onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editLogin">Логин</Label>
                <Input
                  id="editLogin"
                  value={editingBranch.login}
                  onChange={(e) => setEditingBranch({ ...editingBranch, login: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editPassword">Пароль</Label>
                <Input
                  id="editPassword"
                  value={editingBranch.password}
                  onChange={(e) => setEditingBranch({ ...editingBranch, password: e.target.value })}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleEditBranch} className="flex-1">
                  Сохранить
                </Button>
                <Button variant="outline" onClick={() => setEditingBranch(null)} className="flex-1">
                  Отмена
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Branches;
