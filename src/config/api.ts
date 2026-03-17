export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// ✅ เพิ่ม Helper ฟังก์ชันสำหรับดึง Token
const getHeaders = () => {
  const token = localStorage.getItem('token'); // อย่าลืมเช็กว่าตอน Login คุณเซฟ Token ชื่ออะไร
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const apiClient = {
  get: async <T = any>(endpoint: string): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
    return res.json();
  },

  post: async <T = any>(endpoint: string, data: any): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(), // ✅ ใส่ Header ตรงนี้
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
    return res.json();
  },

  put: async <T = any>(endpoint: string, data: any): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(), // ✅ ใส่ Header ตรงนี้
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
    return res.json();
  },

  delete: async <T = any>(endpoint: string): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders() // ✅ ใส่ Header ตรงนี้
    });
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
    return res.json();
  }
};