import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaPlus, FaEdit, FaTrash, FaUsers, FaArrowLeft, 
  FaTicketAlt, FaUserCog, FaTimes
} from 'react-icons/fa';
import { LogoutButton } from '../components/LogoutButton';
import { apiClient, API_BASE_URL } from '../config/api';
import type { User, Lottery } from '../types';
import toast from 'react-hot-toast';


export const DashboardAdminPage = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'lotteries'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for User
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null); 
  const [formData, setFormData] = useState({
    username: '', password: '', name: '', 
    assigned_template_id: '', allowed_template_ids: [] as string[],
    is_suspended: false
  });

  // Modal State for Lottery
  const [isLotteryModalOpen, setIsLotteryModalOpen] = useState(false);
  const [editingLottery, setEditingLottery] = useState<Lottery | null>(null);
  const [lotteryFormData, setLotteryFormData] = useState({
    name: '', template_id: '', closing_time: '', is_active: true, icon_url: ''
  });

  useEffect(() => {
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
    if (!confirm("⚠️ ยืนยันการลบสมาชิกคนนี้?\nแม่พิมพ์ส่วนตัวของเขาจะถูกลบไปด้วยและกู้คืนไม่ได้")) return;
    try {
      await apiClient.delete(`/api/users/${id}`);
      setUsers(users.filter(u => u.id !== id));
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + (error.message || error));
    }
  };

  const handleDeleteLottery = async (id: string) => {
    if (!confirm("⚠️ ยืนยันการลบหวยรายการนี้?")) return;
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
      toast.success("บันทึกข้อมูลสมาชิกสำเร็จ"); // ✅ เปลี่ยน alert เป็น toast
      setIsModalOpen(false);
      fetchUsers();
      resetForm();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + (error.message || error)); // ✅ เปลี่ยน alert เป็น toast
    }
  };
  const handleSaveLottery = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const payload: any = {
            name: lotteryFormData.name,
            template_id: lotteryFormData.template_id || null, 
            is_active: lotteryFormData.is_active,
            closing_time: lotteryFormData.closing_time ? new Date(lotteryFormData.closing_time).toISOString() : null,
            icon_url: lotteryFormData.icon_url
        };

        if (editingLottery) {
            await apiClient.put(`/api/lotteries/${editingLottery.id}`, payload);
        } else {
            await apiClient.post('/api/lotteries', payload);
        }
        toast.success("บันทึกข้อมูลหวยสำเร็จ"); // ✅ เปลี่ยน alert เป็น toast
        setIsLotteryModalOpen(false);
        fetchLotteries();
    } catch (error: any) {
        toast.error("บันทึกไม่สำเร็จ: " + (error.message || error)); // ✅ เปลี่ยน alert เป็น toast
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
      assigned_template_id: user.assigned_template_id || '', allowed_template_ids: user.allowed_template_ids || [],
      is_suspended: user.is_suspended || false 
    });
    setIsModalOpen(true);
  };

  const openCreateLotteryModal = () => {
    setEditingLottery(null);
    setLotteryFormData({ name: '', template_id: '', closing_time: '', is_active: true, icon_url: '' });
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
        closing_time: closingTimeStr, is_active: lottery.is_active,
        icon_url: lottery.icon_url || ''
    });
    setIsLotteryModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ username: '', password: '', name: '', assigned_template_id: '', allowed_template_ids: [], is_suspended: false });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* 🌟 Header (Sticky & Glassmorphism) */}
      <div className="bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3 md:gap-4">
            <Link to="/" className="text-gray-500 hover:text-blue-600 bg-gray-100 p-2 md:px-3 rounded-lg flex items-center gap-2 font-bold transition">
                <FaArrowLeft /> <span className="hidden sm:inline">หน้าผู้ใช้</span>
            </Link>
            <div className="h-6 w-px bg-gray-300 hidden sm:block"></div> 
            <h1 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2 truncate">
                ⚙️ จัดการหลังบ้าน
            </h1>
        </div>
        <LogoutButton /> 
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        
        {/* 🌟 Modern Tabs */}
        <div className="flex gap-2 md:gap-4 mb-6 md:mb-8 overflow-x-auto pb-2 hide-scrollbar">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 md:px-6 py-2.5 rounded-full flex items-center gap-2 font-bold transition-all whitespace-nowrap shadow-sm ${
              activeTab === 'users' ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <FaUsers /> สมาชิก <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'users' ? 'bg-white/20' : 'bg-gray-200'}`}>{users.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('lotteries')}
            className={`px-4 md:px-6 py-2.5 rounded-full flex items-center gap-2 font-bold transition-all whitespace-nowrap shadow-sm ${
              activeTab === 'lotteries' ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <FaTicketAlt /> รายการหวย <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'lotteries' ? 'bg-white/20' : 'bg-gray-200'}`}>{lotteries.length}</span>
          </button>
        </div>

        {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <div className="animate-spin text-4xl mb-4 text-blue-500">⏳</div>
                <div className="font-bold">กำลังโหลดข้อมูล...</div>
            </div>
        ) : (
          <div className="animate-fade-in">
            {/* ======================================= */}
            {/* TAB 1: USERS (จัดการสมาชิก) */}
            {/* ======================================= */}
            {activeTab === 'users' && (
              <div>
                <div className="flex justify-between items-center mb-4 md:mb-6">
                  <h2 className="text-lg md:text-xl font-bold text-gray-800">รายชื่อสมาชิก</h2>
                  <button onClick={openCreateModal} className="bg-green-600 text-white px-4 md:px-5 py-2.5 rounded-xl shadow-[0_4px_15px_rgba(34,197,94,0.3)] hover:bg-green-700 flex items-center gap-2 font-bold transition transform active:scale-95">
                    <FaPlus /> <span className="hidden sm:inline">เพิ่มสมาชิกใหม่</span>
                  </button>
                </div>

                {/* 📱 Mobile View: Cards */}
                <div className="md:hidden space-y-4">
                    {users.map(u => (
                        <div key={u.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-3 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-linear-to-br from-transparent to-gray-50 -z-10 rounded-bl-full opacity-50"></div>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                        {u.username}
                                    </h3>
                                    <p className="text-sm text-gray-500">{u.name}</p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {u.role}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <Link 
                                    to={`/admin/user/${u.id}`}
                                    className="col-span-2 bg-purple-50 text-purple-600 py-2 rounded-lg flex items-center justify-center gap-2 font-bold text-sm hover:bg-purple-100 transition"
                                >
                                    <FaUserCog /> เข้าพื้นที่ส่วนตัว
                                </Link>
                                <button onClick={() => openEditModal(u)} className="bg-blue-50 text-blue-600 py-2 rounded-lg flex items-center justify-center gap-2 font-bold text-sm hover:bg-blue-100">
                                    <FaEdit /> แก้ไข
                                </button>
                                <button onClick={() => handleDeleteUser(u.id)} className="bg-red-50 text-red-500 py-2 rounded-lg flex items-center justify-center gap-2 font-bold text-sm hover:bg-red-100">
                                    <FaTrash /> ลบ
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 💻 Desktop View: Table */}
                <div className="hidden md:block bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Username</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ชื่อเล่น</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">บทบาท</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {users.map((u) => (
                          <tr key={u.id} className="hover:bg-blue-50/50 transition">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{u.username}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{u.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {u.role}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2 items-center">
                              <Link 
                                to={`/admin/user/${u.id}`}
                                className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-600 px-3 py-2 rounded-lg hover:bg-purple-100 transition font-bold text-xs"
                              >
                                <FaUserCog /> เข้าพื้นที่ส่วนตัว
                              </Link>
                              <button onClick={() => openEditModal(u)} className="text-blue-600 bg-blue-50 p-2.5 rounded-lg hover:bg-blue-100 transition" title="แก้ไข"><FaEdit /></button>
                              <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 bg-red-50 p-2.5 rounded-lg hover:bg-red-100 transition" title="ลบ"><FaTrash /></button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ======================================= */}
            {/* TAB 2: LOTTERIES (จัดการหวย) */}
            {/* ======================================= */}
            {activeTab === 'lotteries' && (
                <div>
                    <div className="flex justify-between items-center mb-4 md:mb-6">
                        <h2 className="text-lg md:text-xl font-bold text-gray-800">รายการหวยทั้งหมด</h2>
                        <button onClick={openCreateLotteryModal} className="bg-green-600 text-white px-4 md:px-5 py-2.5 rounded-xl shadow-[0_4px_15px_rgba(34,197,94,0.3)] hover:bg-green-700 flex items-center gap-2 font-bold transition transform active:scale-95">
                            <FaPlus /> <span className="hidden sm:inline">เพิ่มหวยใหม่</span>
                        </button>
                    </div>

                    {/* 📱 Mobile View: Cards */}
                    <div className="md:hidden space-y-4">
                        {lotteries.map((lotto) => (
                            <div key={lotto.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-gray-900 text-base">{lotto.name}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${lotto.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {lotto.is_active ? 'เปิดรับ' : 'ปิดรับ'}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-md">
                                    ⏰ ปิดรับ: {lotto.closing_time ? new Date(lotto.closing_time).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : 'ไม่กำหนด'}
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <button onClick={() => openEditLotteryModal(lotto)} className="bg-blue-50 text-blue-600 py-2 rounded-lg flex items-center justify-center gap-2 font-bold text-sm hover:bg-blue-100">
                                        <FaEdit /> แก้ไข
                                    </button>
                                    <button onClick={() => handleDeleteLottery(lotto.id)} className="bg-red-50 text-red-500 py-2 rounded-lg flex items-center justify-center gap-2 font-bold text-sm hover:bg-red-100">
                                        <FaTrash /> ลบ
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 💻 Desktop View: Table */}
                    <div className="hidden md:block bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ชื่อหวย</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">เวลาปิดรับ</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">สถานะ</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {lotteries.map((lotto) => (
                                    <tr key={lotto.id} className="hover:bg-blue-50/50 transition">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{lotto.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {lotto.closing_time ? new Date(lotto.closing_time).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${lotto.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {lotto.is_active ? 'เปิดรับ' : 'ปิดรับ'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                                            <button onClick={() => openEditLotteryModal(lotto)} className="text-blue-600 bg-blue-50 p-2.5 rounded-lg hover:bg-blue-100 transition"><FaEdit /></button>
                                            <button onClick={() => handleDeleteLottery(lotto.id)} className="text-red-500 bg-red-50 p-2.5 rounded-lg hover:bg-red-100 transition"><FaTrash /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================= */}
      {/* 🌟 MODALS (เพิ่ม/แก้ไข สมาชิก) */}
      {/* ======================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8 animate-fade-in relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 bg-gray-50 rounded-full">
                <FaTimes />
            </button>
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">{editingUser ? <FaEdit /> : <FaPlus />}</div>
              {editingUser ? 'แก้ไขข้อมูลสมาชิก' : 'เพิ่มสมาชิกใหม่'}
            </h3>
            
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Username (ใช้ล็อกอิน)</label>
                <input type="text" required disabled={!!editingUser} value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อเรียก (แสดงในระบบ)</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">รหัสผ่าน {editingUser && <span className="text-xs text-blue-500 font-normal ml-1 bg-blue-50 px-2 py-0.5 rounded-full">เว้นว่างถ้าไม่เปลี่ยน</span>}</label>
                <input type="password" required={!editingUser} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder:text-gray-300" placeholder="••••••••" />
              </div>
              {/* ✅ โซนระงับการใช้งาน */}
              <div className="pt-4 border-t border-gray-100 mt-2 mb-4">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-red-100 bg-red-50/50 hover:border-red-200 transition">
                      <div className="relative">
                          <input 
                              type="checkbox" 
                              checked={formData.is_suspended || false} 
                              onChange={e => setFormData({...formData, is_suspended: e.target.checked})} 
                              className="sr-only" 
                          />
                          <div className={`block w-12 h-7 rounded-full transition-colors ${formData.is_suspended ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                          <div className={`dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${formData.is_suspended ? 'transform translate-x-5' : ''}`}></div>
                      </div>
                      <div className="font-bold text-red-700 text-sm">
                          🚨 ระงับการใช้งาน (แบนไอดีนี้)
                      </div>
                  </label>
              </div>
              <div className="flex gap-3 pt-6 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 rounded-xl hover:bg-gray-200 transition">ยกเลิก</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-[0_4px_15px_rgba(37,99,235,0.3)] transition transform active:scale-95">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* 🌟 MODALS (เพิ่ม/แก้ไข หวย) */}
      {/* ======================================= */}
      {isLotteryModalOpen && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8 animate-fade-in relative">
             <button onClick={() => setIsLotteryModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 bg-gray-50 rounded-full">
                <FaTimes />
             </button>
             <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <div className="bg-green-100 text-green-600 p-2 rounded-lg"><FaTicketAlt /></div>
                จัดการรายการหวย
             </h3>
             <form onSubmit={handleSaveLottery} className="space-y-4">
                {/* ✅ โซนอัปโหลดรูปไอคอนหวย */}
                <div className="space-y-2 mb-4">
                    <label className="text-sm font-bold text-gray-600">รูปภาพหน้าเลือกหวย (Icon)</label>
                    <div className="flex items-center gap-4">
                        {lotteryFormData.icon_url ? (
                            <img src={lotteryFormData.icon_url} alt="Icon" className="w-16 h-16 rounded-xl object-cover border-2 border-blue-200" />
                        ) : (
                            <div className="w-16 h-16 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">ไม่มีรูป</div>
                        )}
                        <div className="flex-1">
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    try {
                                        toast.loading("กำลังอัปโหลด...", { id: "upload" });
                                        const res = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
                                        const data = await res.json();
                                        setLotteryFormData({...lotteryFormData, icon_url: data.url});
                                        toast.success("อัปโหลดรูปสำเร็จ!", { id: "upload" });
                                    } catch (err) {
                                        toast.error("อัปโหลดไม่สำเร็จ", { id: "upload" });
                                    }
                                }}
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อหวย (เช่น ฮานอยพิเศษ)</label>
                    <input type="text" value={lotteryFormData.name} onChange={e => setLotteryFormData({...lotteryFormData, name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" required />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">เวลาปิดรับ (ถ้ามี)</label>
                    <input type="datetime-local" value={lotteryFormData.closing_time} onChange={e => setLotteryFormData({...lotteryFormData, closing_time: e.target.value})} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none cursor-pointer" />
                </div>
                
                <div className="pt-2">
                    <label className="flex items-center gap-3 cursor-pointer bg-gray-50 p-4 rounded-xl border border-gray-200 hover:bg-green-50 hover:border-green-200 transition">
                        <div className="relative">
                            <input type="checkbox" checked={lotteryFormData.is_active} onChange={e => setLotteryFormData({...lotteryFormData, is_active: e.target.checked})} className="sr-only" />
                            <div className={`block w-14 h-8 rounded-full transition-colors ${lotteryFormData.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${lotteryFormData.is_active ? 'transform translate-x-6' : ''}`}></div>
                        </div>
                        <div className="font-bold text-gray-700 text-sm">
                            เปิดใช้งานให้เล่นได้ (Active)
                        </div>
                    </label>
                </div>

                <div className="flex gap-3 pt-6 mt-4">
                    <button type="button" onClick={() => setIsLotteryModalOpen(false)} className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 rounded-xl hover:bg-gray-200 transition">ยกเลิก</button>
                    <button type="submit" className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-[0_4px_15px_rgba(34,197,94,0.3)] transition transform active:scale-95">บันทึกข้อมูล</button>
                </div>
             </form>
           </div>
         </div>
      )}
    </div>
  );
};