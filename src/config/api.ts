/**
 * API Configuration และ Helper Functions
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Generic API Client
 */
export const apiClient = {
  /**
   * GET Request
   */
  get: async <T = any>(endpoint: string): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errorData.detail || `API Error: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * POST Request
   */
  post: async <T = any>(endpoint: string, data: any): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errorData.detail || `API Error: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * PUT Request
   */
  put: async <T = any>(endpoint: string, data: any): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errorData.detail || `API Error: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * DELETE Request
   */
  delete: async <T = any>(endpoint: string): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errorData.detail || `API Error: ${res.statusText}`);
    }
    return res.json();
  }
};
