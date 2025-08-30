
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { storage } from '@/utils/storage';
import { apiService } from '@/utils/api';
import { toast } from '@/hooks/use-toast';

const Login: React.FC = () => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiService.login({ login, password });
      
      if (response.error) {
        toast({ 
          title: 'Ошибка входа', 
          description: response.error,
          variant: 'destructive'
        });
        return;
      }

      if (response.data?.user) {
        storage.setCurrentUser(response.data.user);
        
        if (response.data.user.role === 'admin') {
          navigate('/admin');
          toast({ title: 'Успешный вход в систему!' });
        } else if (response.data.user.role === 'branch') {
          navigate('/branch');
          toast({ title: `Добро пожаловать в ${response.data.user.branch_name}!` });
        }
      }
    } catch (error) {
      toast({ 
        title: 'Ошибка', 
        description: 'Произошла ошибка при входе в систему',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Система управления складом</h1>
          <p className="text-gray-600 mt-2">Войдите в систему для продолжения</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <Label htmlFor="login">Логин</Label>
            <Input
              id="login"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Введите логин"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
              className="mt-1"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Вход...' : 'Войти'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Для входа в главный склад:</p>
          <p className="font-mono">admin / admin</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
