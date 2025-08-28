
interface User {
  id: string;
  login: string;
  role: string;
  password?: string;
  branchName?: string;
  branchId?: string;
  loginTime?: number;
}

class StorageService {
  private readonly USER_KEY = 'current_user';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return null;
    
    try {
      const user = JSON.parse(userStr);
      // Для пользователей branch role, branch_id = user_id
      if (user.role === 'branch') {
        return {
          ...user,
          branchId: user.id
        };
      }
      return user;
    } catch {
      return null;
    }
  }

  setCurrentUser(user: User): void {
    // Для пользователей branch role, устанавливаем branch_id = user_id
    if (user.role === 'branch') {
      user.branchId = user.id;
    }
    
    // Store login time for session validation
    const userWithTimestamp = {
      ...user,
      loginTime: Date.now()
    };
    
    localStorage.setItem(this.USER_KEY, JSON.stringify(userWithTimestamp));
    console.log('User saved to storage:', userWithTimestamp);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  isSessionValid(): boolean {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) {
      console.log('No user data in storage');
      return false;
    }
    
    try {
      const userData = JSON.parse(userStr);
      // Если нет времени логина, считаем сессию действительной (обратная совместимость)
      if (!userData.loginTime) {
        console.log('No login time found, session valid for compatibility');
        return true;
      }
      
      const loginTime = userData.loginTime;
      const currentTime = Date.now();
      const timeDiff = currentTime - loginTime;
      
      const isValid = timeDiff < this.SESSION_DURATION;
      console.log('Session validation:', {
        loginTime: new Date(loginTime),
        currentTime: new Date(currentTime),
        timeDiff: Math.round(timeDiff / 1000 / 60), // minutes
        sessionDuration: Math.round(this.SESSION_DURATION / 1000 / 60), // minutes
        isValid
      });
      
      return isValid;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }

  logout(): void {
    console.log('Logging out user, clearing storage');
    this.clearStorage();
  }

  clearStorage(): void {
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    console.log('Storage cleared');
  }

  // Новый метод для обновления времени сессии
  refreshSession(): void {
    const user = this.getCurrentUser();
    if (user) {
      console.log('Refreshing session for user:', user.login);
      this.setCurrentUser(user);
    }
  }

  // Метод для получения оставшегося времени сессии
  getSessionTimeLeft(): number {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return 0;
    
    try {
      const userData = JSON.parse(userStr);
      if (!userData.loginTime) return this.SESSION_DURATION;
      
      const loginTime = userData.loginTime;
      const currentTime = Date.now();
      const timeLeft = this.SESSION_DURATION - (currentTime - loginTime);
      
      return Math.max(0, timeLeft);
    } catch {
      return 0;
    }
  }
}

export const storage = new StorageService();
