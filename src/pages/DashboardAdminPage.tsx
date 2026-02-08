import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaLayerGroup, FaUsers, FaArrowLeft, FaKey, FaUserTag } from 'react-icons/fa';
import { LogoutButton } from '../components/LogoutButton';
import { apiClient } from '../config/api';
import type { Template, User } from '../types';

export const DashboardAdminPage = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'users'>('templates');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // ✅ 1. ประกาศตัวแปร loading (ที่มีปัญหา)
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null); 
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    assigned_template_id: ''
  });

  useEffect(() => {
    Promise.all([fetchTemplates(), fetchUsers()])
      .then(() => setLoading(false))
      .catch((err: any) => {
        console.error(err);
        alert('โหลดข้อมูลไม่สำเร็จ: ' + (err.message || err));
        setLoading(false);
      });
  }, []);

  const fetchTemplates = async () => {
    const data = await apiClient.get<Template[]>('/api/templates');
    setTemplates(data);
  };

  const fetchUsers = async () => {
    const data = await apiClient.get<User[]>('/api/users');
    setUsers(data);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("ยืนยันการลบแม่พิมพ์? (กู้คืนไม่ได้นะ)")) return;
    try {
      await apiClient.delete(`/api/templates/${id}`);
      setTemplates(templates.filter(t => t.id !== id));
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + (error.message || error));
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("ยืนยันการลบสมาชิกคนนี้?")) return;
    try {
      await apiClient.delete(`/api/users/${id}`);
      setUsers(users.filter(u => u.id !== id));
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + (error.message || error));
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...formData, role: 'member' };
      if (!payload.assigned_template_id) delete payload.assigned_template_id;

      if (editingUser) {
        await apiClient.put(`/api/users/${editingUser.id}`, payload);
      } else {
        await apiClient.post('/api/users', payload);
      }

      alert("✅ บันทึกข้อมูลสำเร็จ");
      setIsModalOpen(false);
      fetchUsers();
      resetForm();

    } catch (error: any) {
      alert("❌ เกิดข้อผิดพลาด: " + (error.message || error));
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      name: user.name,
      assigned_template_id: user.assigned_template_id || ''
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ username: '', password: '', name: '', assigned_template_id: '' });
  };

  // --- ส่วนแสดงผล ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white shadow-sm border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          ⚙️ ระบบจัดการหลังบ้าน (Admin)
        </h1>
        <Link to="/" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
           <FaArrowLeft /> กลับไปหน้าเลือกหวย (User)
        </Link>
        <div className="h-6 w-px bg-gray-300"></div> 
          <LogoutButton /> 
        </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-8">
        
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-3 px-4 flex items-center gap-2 font-medium transition border-b-2 ${
              activeTab === 'templates' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FaLayerGroup /> จัดการแม่พิมพ์ ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-4 flex items-center gap-2 font-medium transition border-b-2 ${
              activeTab === 'users' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FaUsers /> จัดการสมาชิก ({users.length})
          </button>
        </div>

        {/* ✅ 2. นำ loading มาใช้ตรงนี้ (แก้ Error: declared but never read) */}
        {loading ? (
            <div className="text-center py-20 text-gray-400">
                กำลังโหลดข้อมูล... ⏳
            </div>
        ) : (
          <>
            {/* --- TAB 1: TEMPLATES --- */}
            {activeTab === 'templates' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-700">รายการแม่พิมพ์ทั้งหมด</h2>
                  <Link 
                    to="/admin/create" 
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 flex items-center gap-2"
                  >
                    <FaPlus /> สร้างแม่พิมพ์ใหม่
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {templates.map((t) => (
                      <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition">
                        <div className="h-40 bg-gray-100 relative">
                          {t.background_url ? (
                            <img src={t.background_url} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-300">NO IMAGE</div>
                          )}
                          <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
                            {t.base_width}x{t.base_height}
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <h3 className="font-bold text-gray-800 truncate">{t.name}</h3>
                          <div className="flex gap-2 mt-3">
                            <Link 
                              to={`/admin/editor/${t.id}`} 
                              className="flex-1 bg-gray-100 text-gray-600 py-1.5 rounded text-center hover:bg-gray-200 flex items-center justify-center gap-1 text-sm"
                            >
                              <FaEdit /> แก้ไข
                            </Link>
                            <button 
                              onClick={() => handleDeleteTemplate(t.id)}
                              className="px-3 bg-red-50 text-red-500 rounded hover:bg-red-100 border border-red-100"
                            >
                              <FaTrash size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* --- TAB 2: USERS --- */}
            {activeTab === 'users' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-700">รายชื่อสมาชิกทั้งหมด</h2>
                  <button 
                    onClick={openCreateModal}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 flex items-center gap-2"
                  >
                    <FaPlus /> เพิ่มสมาชิกใหม่
                  </button>
                </div>

                <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อเล่น</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">แม่พิมพ์ประจำตัว</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((u) => {
                        const assignedTemplate = templates.find(t => t.id === u.assigned_template_id);
                        return (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              {u.username} 
                              {u.role === 'admin' && <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-600 rounded-full">Admin</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {assignedTemplate ? (
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                  {assignedTemplate.name}
                                </span>
                              ) : (
                                <span className="text-gray-400">- ไม่ได้ระบุ -</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button onClick={() => openEditModal(u)} className="text-indigo-600 hover:text-indigo-900 mr-4"><FaEdit /></button>
                              <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:text-red-900"><FaTrash /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              {editingUser ? <FaEdit /> : <FaPlus />} 
              {editingUser ? 'แก้ไขข้อมูลสมาชิก' : 'เพิ่มสมาชิกใหม่'}
            </h3>
            
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username (ไอดีเข้าสู่ระบบ)</label>
                <input 
                  type="text" 
                  required
                  disabled={!!editingUser}
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-gray-50 disabled:text-gray-400"
                  placeholder="เช่น user01"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FaUserTag /> ชื่อเล่น (Display Name)
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                  placeholder="เช่น พี่สมชาย มังกรทอง"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FaKey /> รหัสผ่าน {editingUser && <span className="text-xs text-gray-400 font-normal">(เว้นว่างไว้ถ้าไม่เปลี่ยน)</span>}
                </label>
                <input 
                  type="password" 
                  required={!editingUser}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                  placeholder="****"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FaLayerGroup /> แม่พิมพ์ประจำตัว (Personal Template)
                </label>
                <select 
                  value={formData.assigned_template_id}
                  onChange={e => setFormData({...formData, assigned_template_id: e.target.value})}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">-- ใช้แม่พิมพ์กลาง (ตามหวย) --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.base_width}x{t.base_height})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};