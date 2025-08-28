
import React, { useState, useEffect } from 'react';
import { storage } from '@/utils/storage';
import { apiService } from '@/utils/api';
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
import { toast } from '@/hooks/use-toast';
import { User, Settings, Plus } from 'lucide-react';

const Profile: React.FC = () => {
  const currentUser = storage.getCurrentUser();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newUserLogin, setNewUserLogin] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await apiService.getUsers();
      if (response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить пользователей', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Ошибка',
        description: 'Пароли не совпадают',
        variant: 'destructive'
      });
      return;
    }

    if (newPassword.length < 3) {
      toast({
        title: 'Ошибка',
        description: 'Пароль должен содержать минимум 3 символа',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await apiService.updateUser(currentUser.id, { password: newPassword });
      
      if (!response.error) {
        storage.setCurrentUser({ ...currentUser, password: newPassword });
        setNewPassword('');
        setConfirmPassword('');
        setShowChangePassword(false);
        toast({ title: 'Успешно', description: 'Пароль изменен' });
      } else {
        toast({ title: 'Ошибка', description: response.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось изменить пароль', variant: 'destructive' });
    }
  };

  const handleAddUser = async () => {
    if (!newUserLogin || !newUserPassword) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все поля',
        variant: 'destructive'
      });
      return;
    }

    if (users.some(user => user.login === newUserLogin)) {
      toast({
        title: 'Ошибка',
        description: 'Пользователь с таким логином уже существует',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await apiService.createUser({
        login: newUserLogin,
        password: newUserPassword,
        role: 'admin'
      });

      if (!response.error && response.data) {
        setUsers(prev => [...prev, response.data]);
        setNewUserLogin('');
        setNewUserPassword('');
        setShowAddUser(false);
        toast({ title: 'Успешно', description: 'Новый пользователь добавлен' });
      } else {
        toast({ title: 'Ошибка', description: response.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось добавить пользователя', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser.id) {
      toast({
        title: 'Ошибка',
        description: 'Нельзя удалить текущего пользователя',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await apiService.deleteUser(userId);
      
      if (!response.error) {
        setUsers(prev => prev.filter(user => user.id !== userId));
        toast({ title: 'Успешно', description: 'Пользователь удален' });
      } else {
        toast({ title: 'Ошибка', description: response.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось удалить пользователя', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Загрузка...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Личный кабинет</h1>
        <p className="text-gray-600 mt-2">Управление учетными записями администраторов</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current User Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <User className="h-6 w-6 mr-2" />
            <h2 className="text-xl font-semibold">Текущий пользователь</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label>Логин</Label>
              <Input value={currentUser?.login || ''} disabled />
            </div>
            
            <div>
              <Label>Роль</Label>
              <Input value="Администратор" disabled />
            </div>
            
            <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Изменить пароль
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Изменить пароль</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="newPassword">Новый пароль</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Подтвердить пароль</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleChangePassword} className="flex-1">
                      Сохранить
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowChangePassword(false)}
                      className="flex-1"
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Пользователи</h2>
            <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Добавить пользователя</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="newUserLogin">Логин</Label>
                    <Input
                      id="newUserLogin"
                      value={newUserLogin}
                      onChange={(e) => setNewUserLogin(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="newUserPassword">Пароль</Label>
                    <Input
                      id="newUserPassword"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleAddUser} className="flex-1">
                      Добавить
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAddUser(false)}
                      className="flex-1"
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-2">
            {users.filter(user => user.role === 'admin').map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{user.login}</p>
                  {user.id === currentUser?.id && (
                    <span className="text-sm text-green-600">(Текущий)</span>
                  )}
                </div>
                {user.id !== currentUser?.id && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    Удалить
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
