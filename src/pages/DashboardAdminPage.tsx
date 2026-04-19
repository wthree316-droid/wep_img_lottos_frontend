import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaPlus, FaEdit, FaTrash, FaUsers, FaArrowLeft, 
  FaTicketAlt, FaUserCog, FaTimes, FaImage
} from 'react-icons/fa';
import { LogoutButton } from '../components/LogoutButton';
import { apiClient, API_BASE_URL } from '../config/api';
import type { User, Lottery, LottoAsset } from '../types';
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
        toast.error('โหลดข้อมูลไม่สำเร็จ: ' + (err.message || err));
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

  // 1. เพิ่ม State สำหรับคลังภาพ
  const [assets, setAssets] = useState<LottoAsset[]>([]);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isSelectingForLotto, setIsSelectingForLotto] = useState(false);

  // 2. ฟังก์ชันดึงข้อมูลคลังภาพ
  const fetchAssets = async () => {
    const data = await apiClient.get<LottoAsset[]>('/api/assets');
    setAssets(data);
  };

  // 3. ฟังก์ชันอัปโหลดรูปเข้าคลังโดยตรง
  const handleUploadToGallery = async (file: File) => {
    try {
        toast.loading("กำลังอัปโหลดเข้าคลัง...", { id: "gallery-up" });
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        
        // บันทึกลงตาราง lotto_assets
        await apiClient.post('/api/assets', { name: file.name, url: data.url });
        
        fetchAssets();
        toast.success("เพิ่มรูปเข้าคลังเรียบร้อย", { id: "gallery-up" });
    } catch (err) {
        toast.error("อัปโหลดล้มเหลว", { id: "gallery-up" });
    }
  };

  // ✅ จุดที่ 1: เพิ่มฟังก์ชัน Toggle นอก Modal
  const handleToggleUserSuspension = async (user: User) => {
    const newStatus = !user.is_suspended;
    try {
      toast.loading(newStatus ? "กำลังระงับการใช้งาน..." : "กำลังปลดระงับ...", { id: 'toggle-user' });
      await apiClient.put(`/api/users/${user.id}`, { is_suspended: newStatus });
      setUsers(users.map(u => u.id === user.id ? { ...u, is_suspended: newStatus } : u));
      toast.success(newStatus ? "ระงับการใช้งานแล้ว" : "ปลดระงับการใช้งานแล้ว", { id: 'toggle-user' });
    } catch (error: any) {
      toast.error("ทำรายการไม่สำเร็จ", { id: 'toggle-user' });
    }
  };

  const handleToggleLotteryStatus = async (lottery: Lottery) => {
    const newStatus = !lottery.is_active;
    try {
      toast.loading(newStatus ? "กำลังเปิดหวย..." : "กำลังปิดหวย...", { id: 'toggle-lotto' });
      await apiClient.put(`/api/lotteries/${lottery.id}`, { is_active: newStatus });
      setLotteries(lotteries.map(l => l.id === lottery.id ? { ...l, is_active: newStatus } : l));
      toast.success(newStatus ? "เปิดรับหวยแล้ว" : "ปิดรับหวยแล้ว", { id: 'toggle-lotto' });
    } catch (error: any) {
      toast.error("ทำรายการไม่สำเร็จ", { id: 'toggle-lotto' });
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("⚠️ ยืนยันการลบสมาชิกคนนี้?\nแม่พิมพ์ส่วนตัวของเขาจะถูกลบไปด้วยและกู้คืนไม่ได้")) return;
    try {
      await apiClient.delete(`/api/users/${id}`);
      setUsers(users.filter(u => u.id !== id));
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + (error.message || error));
    }
  };

  const handleDeleteLottery = async (id: string) => {
    if (!confirm("⚠️ ยืนยันการลบหวยรายการนี้?")) return;
    try {
      await apiClient.delete(`/api/lotteries/${id}`);
      setLotteries(lotteries.filter(l => l.id !== id));
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + (error.message || error));
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
      toast.success("บันทึกข้อมูลสมาชิกสำเร็จ"); 
      setIsModalOpen(false);
      fetchUsers();
      resetForm();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด: " + (error.message || error)); 
    }
  };
  const handleSaveLottery = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const payload: any = {
            name: lotteryFormData.name,
            template_id: lotteryFormData.template_id || null, 
            is_active: lotteryFormData.is_active,
            closing_time: lotteryFormData.closing_time || null, // ✅ ส่งไปตรงๆ ได้เลย
            icon_url: lotteryFormData.icon_url
        };

        if (editingLottery) {
            await apiClient.put(`/api/lotteries/${editingLottery.id}`, payload);
        } else {
            await apiClient.post('/api/lotteries', payload);
        }
        toast.success("บันทึกข้อมูลหวยสำเร็จ"); 
        setIsLotteryModalOpen(false);
        fetchLotteries();
    } catch (error: any) {
        toast.error("บันทึกไม่สำเร็จ: " + (error.message || error)); 
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
    setLotteryFormData({
        name: lottery.name, 
        template_id: lottery.template_id || '',
        closing_time: lottery.closing_time || '', // ✅ ดึงมาใส่ตรงๆ ได้เลย
        is_active: lottery.is_active,
        icon_url: lottery.icon_url || ''
    });
    setIsLotteryModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ username: '', password: '', name: '', assigned_template_id: '', allowed_template_ids: [], is_suspended: false });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 flex flex-col font-sans">
      
      {/* 🌟 Header (Dark Luxury) */}
      <div className="bg-[#141414] border-b border-[#D4AF37]/20 px-4 md:px-8 py-3 md:py-4 flex justify-between items-center sticky top-0 z-30 shadow-2xl">
        <div className="flex items-center gap-3 md:gap-4">
            <Link to="/" className="text-[#D4AF37] hover:bg-[#D4AF37]/10 p-2 md:px-3 rounded-lg flex items-center gap-2 font-bold transition border border-[#D4AF37]/30">
                <FaArrowLeft /> <span className="hidden sm:inline">หน้าผู้ใช้</span>
            </Link>
            <div className="h-6 w-px bg-[#D4AF37]/30 hidden sm:block"></div> 
            <h1 className="text-lg md:text-xl font-bold bg-linear-to-r from-[#D4AF37] to-[#fcf6ba] bg-clip-text text-transparent flex items-center gap-2 truncate">
                GOLDEN ADMIN
            </h1>
        </div>
        <LogoutButton /> 
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        
        {/* 🌟 Modern Tabs (Dark/Gold Theme) */}
        <div className="flex gap-2 md:gap-4 mb-6 md:mb-8 overflow-x-auto pb-2 hide-scrollbar">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 md:px-8 py-3 rounded-xl flex items-center gap-2 font-bold transition-all border ${
              activeTab === 'users' 
              ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.3)]' 
              : 'bg-[#1a1a1a] text-gray-400 border-white/10 hover:border-[#D4AF37]/50'
            }`}
          >
            <FaUsers /> สมาชิก <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'users' ? 'bg-black/20' : 'bg-white/10'}`}>{users.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('lotteries')}
            className={`px-4 md:px-8 py-3 rounded-xl flex items-center gap-2 font-bold transition-all border ${
              activeTab === 'lotteries' 
              ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.3)]' 
              : 'bg-[#1a1a1a] text-gray-400 border-white/10 hover:border-[#D4AF37]/50'
            }`}
          >
            <FaTicketAlt /> รายการหวย <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'lotteries' ? 'bg-black/20' : 'bg-white/10'}`}>{lotteries.length}</span>
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
              <div className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-white/5 flex justify-between items-center bg-[#1a1a1a]">
                    <h2 className="text-base md:text-lg font-bold text-[#D4AF37]">รายชื่อสมาชิกทั้งหมด</h2>
                    <button onClick={openCreateModal} className="bg-[#D4AF37] text-black px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-bold flex items-center gap-2 hover:brightness-110 transition shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                        <FaPlus /> <span className="hidden sm:inline">เพิ่มสมาชิก</span>
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-150">
                      <thead className="bg-[#1a1a1a] text-[#D4AF37] text-xs uppercase">
                          <tr>
                              <th className="px-6 py-4">Username / ชื่อ</th>
                              <th className="px-6 py-4">สถานะการใช้งาน</th>
                              <th className="px-6 py-4 text-right">การจัดการ</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {users.map(u => (
                              <tr key={u.id} className="hover:bg-white/5 transition">
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-white flex items-center gap-2">
                                          {u.username}
                                          <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider ${u.role === 'admin' ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50' : 'bg-gray-800 text-gray-400'}`}>{u.role}</span>
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">{u.name}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      {/* ✅ ปุ่ม Toggle ระงับผู้ใช้ */}
                                      <button 
                                          onClick={() => handleToggleUserSuspension(u)}
                                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition ${u.is_suspended ? 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-500/20'}`}
                                      >
                                          {u.is_suspended ? <>🔴 ระงับอยู่</> : <>🟢 ปกติ</>}
                                      </button>
                                  </td>
                                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                                      <Link to={`/admin/user/${u.id}`} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition" title="พื้นที่ส่วนตัว"><FaUserCog /></Link>
                                      <button onClick={() => openEditModal(u)} className="p-2 text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-lg transition" title="แก้ไข"><FaEdit /></button>
                                      <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition" title="ลบ"><FaTrash /></button>
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
              <div className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-white/5 flex justify-between items-center bg-[#1a1a1a]">
                    <h2 className="text-base md:text-lg font-bold text-[#D4AF37]">รายการหวย</h2>
                    <button onClick={openCreateLotteryModal} className="bg-[#D4AF37] text-black px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-bold flex items-center gap-2 hover:brightness-110 transition shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                        <FaPlus /> <span className="hidden sm:inline">เพิ่มหวยใหม่</span>
                    </button>
                </div>
                
                {/* แสดงผลแบบ Grid Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 p-4 md:p-6">
                    {lotteries.map(l => (
                        <div key={l.id} className={`bg-[#1a1a1a] rounded-2xl border ${l.is_active ? 'border-[#D4AF37]/30 shadow-[0_0_15px_rgba(212,175,55,0.05)]' : 'border-white/5'} p-5 relative group overflow-hidden`}>
                            <div className="flex items-center gap-4 mb-4">
                                <img src={l.icon_url || "https://placehold.co/100"} className="w-14 h-14 rounded-xl object-cover border border-white/10" />
                                <div>
                                    <h3 className="font-bold text-white line-clamp-1">{l.name}</h3>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">
                                        ปิด: {l.closing_time ? new Date(l.closing_time).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : '-'}
                                    </p>
                                </div>
                            </div>
                            
                            {/* ✅ ปุ่ม Quick Toggle เปิด-ปิดหวย */}
                            <button 
                                onClick={() => handleToggleLotteryStatus(l)}
                                className={`w-full py-2.5 rounded-xl font-bold text-xs mb-3 flex items-center justify-center gap-2 transition ${l.is_active ? 'bg-[#D4AF37] text-black hover:brightness-110' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                            >
                                {l.is_active ? <>🟢 เปิดรับงานอยู่</> : <>🔴 ปิดรับงาน</>}
                            </button>

                            <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-3">
                                <button onClick={() => openEditLotteryModal(l)} className="text-gray-400 hover:text-[#D4AF37] transition text-sm flex items-center gap-1 font-bold">
                                    <FaEdit /> แก้ไข
                                </button>
                                <button onClick={() => handleDeleteLottery(l.id)} className="text-gray-600 hover:text-red-500 transition text-sm flex items-center gap-1 font-bold">
                                    <FaTrash /> ลบ
                                </button>
                            </div>
                        </div>
                    ))}
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] rounded-3xl shadow-[0_0_30px_rgba(212,175,55,0.15)] border border-[#D4AF37]/20 w-full max-w-md p-6 md:p-8 animate-fade-in relative overflow-hidden">
            
            {/* แสงฟุ้งตกแต่ง */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] opacity-10 blur-[50px] pointer-events-none"></div>

            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-[#D4AF37] p-2 bg-black border border-gray-800 hover:border-[#D4AF37]/50 rounded-full transition-all">
                <FaTimes />
            </button>
            <h3 className="text-xl font-bold text-[#D4AF37] mb-6 flex items-center gap-3">
              <div className="bg-gradient-to-br from-[#BF953F] to-[#FCF6BA] text-black p-2.5 rounded-lg shadow-lg">
                  {editingUser ? <FaEdit /> : <FaPlus />}
              </div>
              {editingUser ? 'แก้ไขข้อมูลสมาชิก' : 'เพิ่มสมาชิกใหม่'}
            </h3>
            
            <form onSubmit={handleSaveUser} className="space-y-4 relative z-10">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1.5 uppercase tracking-wider text-[11px]">Username (ใช้ล็อกอิน)</label>
                <input type="text" required disabled={!!editingUser} value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full p-3 bg-[#0a0a0a] text-white border border-gray-800 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none disabled:bg-gray-900 disabled:text-gray-600 transition" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1.5 uppercase tracking-wider text-[11px]">ชื่อเรียก (แสดงในระบบ)</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-[#0a0a0a] text-white border border-gray-800 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none transition" />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-300 mb-1.5 uppercase tracking-wider text-[11px] flex items-center gap-2">
                    รหัสผ่าน 
                    {editingUser && <span className="text-[10px] text-[#D4AF37] font-normal bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2 py-0.5 rounded-full">เว้นว่างถ้าไม่เปลี่ยน</span>}
                </label>
                <input type="password" required={!editingUser} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3 bg-[#0a0a0a] text-white border border-gray-800 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none placeholder:text-gray-700 transition" placeholder="••••••••" />
              </div>
              
              {/* ✅ โซนระงับการใช้งาน */}
              <div className="pt-4 border-t border-white/5 mt-2 mb-4">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-red-900/30 bg-red-900/10 hover:border-red-500/30 transition">
                      <div className="relative">
                          <input 
                              type="checkbox" 
                              checked={formData.is_suspended || false} 
                              onChange={e => setFormData({...formData, is_suspended: e.target.checked})} 
                              className="sr-only" 
                          />
                          <div className={`block w-12 h-7 rounded-full transition-colors ${formData.is_suspended ? 'bg-red-600' : 'bg-gray-700'}`}></div>
                          <div className={`dot absolute left-1 top-1 w-5 h-5 rounded-full transition-transform ${formData.is_suspended ? 'transform translate-x-5 bg-white' : 'bg-gray-400'}`}></div>
                      </div>
                      <div className="font-bold text-red-500 text-sm">
                          🚨 ระงับการใช้งาน (แบนไอดีนี้)
                      </div>
                  </label>
              </div>

              <div className="flex gap-3 pt-6 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-300 font-bold bg-gray-800 rounded-xl hover:bg-gray-700 hover:text-white transition">ยกเลิก</button>
                <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-black font-bold rounded-xl hover:brightness-110 shadow-[0_4px_15px_rgba(212,175,55,0.3)] transition transform active:scale-95">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ======================================= */}
      {/* 🌟 MODALS (เพิ่ม/แก้ไข หวย) */}
      {/* ======================================= */}
      {isLotteryModalOpen && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-[#141414] rounded-3xl shadow-[0_0_30px_rgba(212,175,55,0.15)] border border-[#D4AF37]/20 w-full max-w-md p-6 md:p-8 animate-fade-in relative overflow-hidden">
             
             {/* แสงฟุ้งตกแต่ง */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] opacity-10 blur-[50px] pointer-events-none"></div>

             <button onClick={() => setIsLotteryModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-[#D4AF37] p-2 bg-black border border-gray-800 hover:border-[#D4AF37]/50 rounded-full transition-all">
                <FaTimes />
             </button>
             <h3 className="text-xl font-bold text-[#D4AF37] mb-6 flex items-center gap-3">
                <div className="bg-gradient-to-br from-[#BF953F] to-[#FCF6BA] text-black p-2.5 rounded-lg shadow-lg">
                    <FaTicketAlt />
                </div>
                จัดการรายการหวย
             </h3>
             <form onSubmit={handleSaveLottery} className="space-y-4 relative z-10">
                {/* ✅ โซนอัปโหลดรูปไอคอนหวย */}
                <div className="space-y-2 mb-4">
                    <label className="text-sm font-bold text-gray-300 uppercase tracking-wider text-[11px]">รูปภาพหน้าเลือกหวย (เลือกจากคลัง)</label>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-4 p-4 bg-[#0a0a0a] rounded-2xl border border-gray-800">
                            {lotteryFormData.icon_url ? (
                                <img src={lotteryFormData.icon_url} alt="Icon" className="w-20 h-20 rounded-xl object-cover border-2 border-[#D4AF37]/50 shadow-lg" />
                            ) : (
                                <div className="w-20 h-20 rounded-xl bg-[#121212] border border-dashed border-gray-700 flex items-center justify-center text-gray-600 text-xs font-bold uppercase tracking-tighter">No Image</div>
                            )}
                            <div className="flex-1">
                                <button 
                                    type="button"
                                    onClick={() => {
                                        fetchAssets();
                                        setIsAssetModalOpen(true);
                                        setIsSelectingForLotto(true); // บอกระบบว่าเปิดมาเพื่อเลือกรูปใส่หวย
                                    }}
                                    className="w-full py-3 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 rounded-xl font-bold text-xs hover:bg-[#D4AF37] hover:text-black transition-all shadow-sm flex items-center justify-center gap-2"
                                >
                                    <FaImage /> เลือกรูปจากคลังภาพ
                                </button>
                                <p className="text-[10px] text-gray-500 mt-2">* รูปภาพจะถูกดึงมาจากคลังส่วนกลาง</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1.5 uppercase tracking-wider text-[11px]">ชื่อหวย (เช่น ฮานอยพิเศษ)</label>
                    <input type="text" value={lotteryFormData.name} onChange={e => setLotteryFormData({...lotteryFormData, name: e.target.value})} className="w-full p-3 bg-[#0a0a0a] text-white border border-gray-800 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none transition" required />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1.5 uppercase tracking-wider text-[11px]">เวลาปิดรับ (ถ้ามี)</label>
                    {/* ใน Modal ของหน้า Admin ตรงเวลาปิดรับ ให้เปลี่ยน type="time" */}
                    <input type="time" value={lotteryFormData.closing_time} onChange={e => setLotteryFormData({...lotteryFormData, closing_time: e.target.value})} className="w-full p-3 bg-[#0a0a0a] text-white border border-gray-800 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none cursor-pointer transition [color-scheme:dark]" />
                </div>
                
                <div className="pt-2">
                    <label className="flex items-center gap-3 cursor-pointer bg-[#0a0a0a] p-4 rounded-xl border border-gray-800 hover:border-[#D4AF37]/50 transition">
                        <div className="relative">
                            <input type="checkbox" checked={lotteryFormData.is_active} onChange={e => setLotteryFormData({...lotteryFormData, is_active: e.target.checked})} className="sr-only" />
                            <div className={`block w-14 h-8 rounded-full transition-colors ${lotteryFormData.is_active ? 'bg-[#D4AF37]' : 'bg-gray-700'}`}></div>
                            <div className={`dot absolute left-1 top-1 w-6 h-6 rounded-full transition-transform ${lotteryFormData.is_active ? 'transform translate-x-6 bg-black' : 'bg-gray-400'}`}></div>
                        </div>
                        <div className="font-bold text-gray-300 text-sm">
                            เปิดใช้งานให้เล่นได้ (Active)
                        </div>
                    </label>
                </div>

                <div className="flex gap-3 pt-6 mt-4 border-t border-white/5">
                    <button type="button" onClick={() => setIsLotteryModalOpen(false)} className="flex-1 py-3 text-gray-300 font-bold bg-gray-800 rounded-xl hover:bg-gray-700 hover:text-white transition">ยกเลิก</button>
                    <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-black font-bold rounded-xl hover:brightness-110 shadow-[0_4px_15px_rgba(212,175,55,0.3)] transition transform active:scale-95">บันทึกข้อมูล</button>
                </div>
             </form>
           </div>
         </div>
      )}
      {/* ======================================= */}
      {/* 🌟 ASSET MANAGER MODAL (คลังภาพส่วนกลาง) */}
      {/* ======================================= */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-9999 flex items-center justify-center p-4">
          <div className="bg-[#141414] rounded-3xl shadow-[0_0_50px_rgba(212,175,55,0.2)] border border-[#D4AF37]/30 w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-fade-in">
            
            {/* Header */}
            <div className="p-6 border-b border-[#D4AF37]/20 flex justify-between items-center bg-[#0a0a0a]">
                <div>
                    <h3 className="text-xl font-bold text-[#D4AF37] flex items-center gap-3">
                        <FaImage /> คลังภาพส่วนกลาง (Asset Gallery)
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">จัดการรูปภาพหวยทั้งหมดในที่เดียว</p>
                </div>
                <div className="flex items-center gap-4">
                    <label className="bg-gradient-to-r from-[#BF953F] to-[#FCF6BA] text-black px-4 py-2 rounded-xl font-bold text-sm cursor-pointer hover:brightness-110 transition shadow-lg flex items-center gap-2">
                        <FaPlus /> เพิ่มรูปเข้าคลัง
                        <input type="file" hidden accept="image/*" onChange={(e) => e.target.files?.[0] && handleUploadToGallery(e.target.files[0])} />
                    </label>
                    <button onClick={() => setIsAssetModalOpen(false)} className="text-gray-500 hover:text-white transition p-2 bg-white/5 rounded-full"><FaTimes /></button>
                </div>
            </div>

            {/* Gallery Content */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 custom-scrollbar">
                {assets.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-gray-600 font-bold uppercase tracking-tighter opacity-30">คลังภาพว่างเปล่า...</div>
                ) : (
                    assets.map(asset => (
                        <div key={asset.id} className="group relative aspect-square bg-[#0a0a0a] rounded-2xl border border-gray-800 overflow-hidden hover:border-[#D4AF37] transition-all duration-300">
                            <img src={asset.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            
                            {/* Overlay Controls */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 backdrop-blur-sm">
                                {isSelectingForLotto ? (
                                    <button 
                                        onClick={() => {
                                            setLotteryFormData({...lotteryFormData, icon_url: asset.url});
                                            setIsAssetModalOpen(false);
                                            setIsSelectingForLotto(false);
                                            toast.success("เลือกรูปจากคลังแล้ว");
                                        }}
                                        className="w-full py-2 bg-[#D4AF37] text-black rounded-lg font-bold text-xs"
                                    >
                                        ใช้รูปนี้
                                    </button>
                                ) : null}
                                <button 
                                    onClick={() => {
                                        if(confirm("ยืนยันการลบรูปออกจากคลัง? (หากมีหวยใบอื่นใช้อยู่ รูปจะพัง)")) {
                                            apiClient.delete(`/api/assets/${asset.id}`).then(() => fetchAssets());
                                        }
                                    }}
                                    className="w-full py-2 bg-red-600/20 text-red-500 border border-red-500/30 rounded-lg font-bold text-[10px] hover:bg-red-600 hover:text-white transition"
                                >
                                    ลบถาวร
                                </button>
                            </div>
                            
                            {/* Label */}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2 text-[9px] text-gray-400 truncate">
                                {asset.name}
                            </div>
                        </div>
                    ))
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};