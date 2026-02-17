// src/pages/DashboardAdminPage.tsx

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaPlus, FaEdit, FaTrash, FaUsers, FaArrowLeft, 
  FaTicketAlt, FaUserCog 
} from 'react-icons/fa';
import { LogoutButton } from '../components/LogoutButton';
import { apiClient } from '../config/api';
import type { User, Lottery } from '../types';

export const DashboardAdminPage = () => {
  // ✅ 1. ตั้ง Default เป็น 'users' เพราะเป็นหัวใจหลักของระบบใหม่
  const [activeTab, setActiveTab] = useState<'users' | 'lotteries'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for User
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null); 
  const [formData, setFormData] = useState({
    username: '', password: '', name: '', 
    assigned_template_id: '', allowed_template_ids: [] as string[]
  });

  // Modal State for Lottery
  const [isLotteryModalOpen, setIsLotteryModalOpen] = useState(false);
  const [editingLottery, setEditingLottery] = useState<Lottery | null>(null);
  const [lotteryFormData, setLotteryFormData] = useState({
    name: '', template_id: '', closing_time: '', is_active: true
  });

  useEffect(() => {
    // ✅ 2. ไม่ต้องโหลด Templates หรือ GlobalConfigs แล้ว
    Promise.all([fetchUsers(), fetchLotteries()])
      .then(() => setLoading(false))
      .catch((err: any) => {
        console.error(err);
        alert('โหลดข้อมูลไม่สำเร็จ: ' + (err.message || err));
        setLoading(false);
      });
  }, []);

  const fetchUsers = async () => {
    const data = await apiClient.get<User[]>('/api/users');
    setUsers(data);
  };

  const fetchLotteries = async () => {
    try {
        const data = await apiClient.get<Lottery[]>('/api/lotteries');
        setLotteries(data);
    } catch (e) { console.error("Failed to load lotteries", e); }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("ยืนยันการลบสมาชิกคนนี้? (แม่พิมพ์ของเขาจะหายไปด้วย)")) return;
    try {
      await apiClient.delete(`/api/users/${id}`);
      setUsers(users.filter(u => u.id !== id));
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + (error.message || error));
    }
  };

  const handleDeleteLottery = async (id: string) => {
    if (!confirm("ยืนยันการลบหวยรายการนี้?")) return;
    try {
      await apiClient.delete(`/api/lotteries/${id}`);
      setLotteries(lotteries.filter(l => l.id !== id));
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
      alert("✅ บันทึกข้อมูลสมาชิกสำเร็จ");
      setIsModalOpen(false);
      fetchUsers();
      resetForm();
    } catch (error: any) {
      alert("❌ เกิดข้อผิดพลาด: " + (error.message || error));
    }
  };

  const handleSaveLottery = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const payload: any = {
            name: lotteryFormData.name,
            template_id: lotteryFormData.template_id || null, 
            is_active: lotteryFormData.is_active,
            closing_time: lotteryFormData.closing_time ? new Date(lotteryFormData.closing_time).toISOString() : null
        };

        if (editingLottery) {
            await apiClient.put(`/api/lotteries/${editingLottery.id}`, payload);
        } else {
            await apiClient.post('/api/lotteries', payload);
        }
        alert("✅ บันทึกข้อมูลหวยสำเร็จ");
        setIsLotteryModalOpen(false);
        fetchLotteries();
    } catch (error: any) {
        alert("❌ บันทึกไม่สำเร็จ: " + (error.message || error));
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
      username: user.username, password: '', name: user.name,
      assigned_template_id: user.assigned_template_id || '', allowed_template_ids: user.allowed_template_ids || []
    });
    setIsModalOpen(true);
  };

  const openCreateLotteryModal = () => {
    setEditingLottery(null);
    setLotteryFormData({ name: '', template_id: '', closing_time: '', is_active: true });
    setIsLotteryModalOpen(true);
  };

  const openEditLotteryModal = (lottery: Lottery) => {
    setEditingLottery(lottery);
    let closingTimeStr = '';
    if (lottery.closing_time) {
        const date = new Date(lottery.closing_time);
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        closingTimeStr = localDate.toISOString().slice(0, 16);
    }
    setLotteryFormData({
        name: lottery.name, template_id: lottery.template_id || '',
        closing_time: closingTimeStr, is_active: lottery.is_active
    });
    setIsLotteryModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ username: '', password: '', name: '', assigned_template_id: '', allowed_template_ids: [] });
  };

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
        
        {/* ✅ 3. เหลือแค่ 2 Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-4 flex items-center gap-2 font-medium transition border-b-2 whitespace-nowrap ${
              activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FaUsers /> จัดการสมาชิก ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('lotteries')}
            className={`pb-3 px-4 flex items-center gap-2 font-medium transition border-b-2 whitespace-nowrap ${
              activeTab === 'lotteries' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FaTicketAlt /> จัดการหวย ({lotteries.length})
          </button>
        </div>

        {loading ? (
            <div className="text-center py-20 text-gray-400">กำลังโหลดข้อมูล... ⏳</div>
        ) : (
          <>
            {activeTab === 'users' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-700">รายชื่อสมาชิกทั้งหมด</h2>
                  <button onClick={openCreateModal} className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 flex items-center gap-2">
                    <FaPlus /> เพิ่มสมาชิกใหม่
                  </button>
                </div>

                <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อเล่น</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">บทบาท</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              {u.username} 
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {u.role === 'admin' 
                                    ? <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded-full text-xs font-bold">Admin</span> 
                                    : <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">Member</span>
                                }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {/* ✅ ปุ่มเข้า Workspace ส่วนตัว */}
                              <Link 
                                to={`/admin/user/${u.id}`}
                                className="inline-flex items-center gap-1 bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-100 mr-2 transition font-bold text-xs"
                              >
                                <FaUserCog /> เข้าพื้นที่ส่วนตัว
                              </Link>

                              <button onClick={() => openEditModal(u)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-2 rounded-lg mr-2"><FaEdit /></button>
                              <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-lg"><FaTrash /></button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'lotteries' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-gray-700">จัดการหวยทั้งหมด ({lotteries.length})</h2>
                        <button onClick={openCreateLotteryModal} className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 flex items-center gap-2">
                            <FaPlus /> เพิ่มหวยใหม่
                        </button>
                    </div>

                    <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อหวย</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เวลาปิดรับ</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {lotteries.map((lotto) => (
                                    <tr key={lotto.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{lotto.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {lotto.closing_time ? new Date(lotto.closing_time).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${lotto.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {lotto.is_active ? 'เปิดใช้งาน' : 'ปิด'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => openEditLotteryModal(lotto)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-2 rounded-lg mr-2"><FaEdit /></button>
                                            <button onClick={() => handleDeleteLottery(lotto.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-lg"><FaTrash /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
          </>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              {editingUser ? <FaEdit /> : <FaPlus />} {editingUser ? 'แก้ไขข้อมูลสมาชิก' : 'เพิ่มสมาชิกใหม่'}
            </h3>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input type="text" required disabled={!!editingUser} value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-gray-50 disabled:text-gray-400" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">ชื่อเล่น (Display Name)</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">รหัสผ่าน {editingUser && <span className="text-xs text-gray-400 font-normal">(เว้นว่างถ้าไม่เปลี่ยน)</span>}</label>
                <input type="password" required={!editingUser} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-100 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">ยกเลิก</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLotteryModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           {/* (Lottery Form เหมือนเดิม) */}
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
             <h3 className="text-xl font-bold text-gray-800 mb-4">จัดการหวย</h3>
             <form onSubmit={handleSaveLottery} className="space-y-4">
                <input type="text" placeholder="ชื่อหวย" value={lotteryFormData.name} onChange={e => setLotteryFormData({...lotteryFormData, name: e.target.value})} className="w-full p-2 border rounded" required />
                <input type="datetime-local" value={lotteryFormData.closing_time} onChange={e => setLotteryFormData({...lotteryFormData, closing_time: e.target.value})} className="w-full p-2 border rounded" />
                <div className="flex gap-2"><input type="checkbox" checked={lotteryFormData.is_active} onChange={e => setLotteryFormData({...lotteryFormData, is_active: e.target.checked})} /> เปิดใช้งาน</div>
                <div className="flex gap-2"><button type="button" onClick={() => setIsLotteryModalOpen(false)} className="flex-1 p-2 border rounded">ยกเลิก</button><button type="submit" className="flex-1 p-2 bg-blue-600 text-white rounded">บันทึก</button></div>
             </form>
           </div>
         </div>
      )}
    </div>
  );
};