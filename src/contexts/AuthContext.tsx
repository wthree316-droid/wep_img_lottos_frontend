import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react'; 

export interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  assigned_template_id?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAdmin: boolean; 
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('lotto_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem('lotto_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const responseData = await res.json();
      
      // ✅ ดึงข้อมูล user และ access_token ออกมาจาก response ของ Backend โฉมใหม่
      const userData = responseData.user;
      const token = responseData.access_token;

      // ✅ เซฟข้อมูลลง State และ LocalStorage
      setUser(userData);
      localStorage.setItem('lotto_user', JSON.stringify(userData)); 
      localStorage.setItem('token', token); // 🔐 เซฟ Token เก็บไว้ให้ api.ts ดึงไปใช้!
      
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('lotto_user');
    localStorage.removeItem('token'); // 🔐 ลบ Token ทิ้งด้วยเพื่อความปลอดภัย
    window.location.href = '/login'; 
  };

  // เช็คว่าเป็น admin หรือไม่
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};