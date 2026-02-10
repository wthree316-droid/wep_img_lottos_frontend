import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaLayerGroup, FaUsers, FaArrowLeft, FaKey, FaUserTag, FaGlobe, FaQrcode, FaLine, FaTicketAlt, FaClock, FaCheckSquare, FaSquare } from 'react-icons/fa';
import { LogoutButton } from '../components/LogoutButton';
import { apiClient } from '../config/api';
import type { Template, User, Lottery } from '../types';

export const DashboardAdminPage = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'users' | 'global' | 'lotteries'>('templates');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  
  const [globalConfigs, setGlobalConfigs] = useState({ qr_code_url: '', line_id: '' });
  
  const [loading, setLoading] = useState(true);

  // Modal State for User
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null); 
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    assigned_template_id: '',
    allowed_template_ids: [] as string[]
  });

  // Modal State for Lottery
  const [isLotteryModalOpen, setIsLotteryModalOpen] = useState(false);
  const [editingLottery, setEditingLottery] = useState<Lottery | null>(null); // If null but modal open, means CREATE mode
  const [lotteryFormData, setLotteryFormData] = useState({
    name: '',
    template_id: '',
    closing_time: '',
    is_active: true
  });

  useEffect(() => {
    Promise.all([fetchTemplates(), fetchUsers(), fetchGlobalConfigs(), fetchLotteries()])
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

  const fetchGlobalConfigs = async () => {
    try {
        const data = await apiClient.get<any>('/api/global-configs');
        setGlobalConfigs(data);
    } catch (e) {
        console.error("Failed to load global configs", e);
    }
  };

  const fetchLotteries = async () => {
    try {
        const data = await apiClient.get<Lottery[]>('/api/lotteries');
        setLotteries(data);
    } catch (e) {
        console.error("Failed to load lotteries", e);
    }
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
      
      if (!payload.assigned_template_id && payload.allowed_template_ids.length > 0) {
          payload.assigned_template_id = payload.allowed_template_ids[0];
      }
      
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

  const handleSaveGlobalConfigs = async () => {
    try {
        await apiClient.put('/api/global-configs', globalConfigs);
        alert("✅ บันทึกค่ากลางเรียบร้อยแล้ว");
    } catch (error: any) {
        alert("❌ บันทึกไม่สำเร็จ: " + (error.message || error));
    }
  };

  const handleUploadQRCode = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!res.ok) throw new Error('Upload failed');
        
        const data = await res.json();
        setGlobalConfigs(prev => ({ ...prev, qr_code_url: data.url }));
    } catch (error: any) {
        alert("อัปโหลดไม่สำเร็จ: " + error.message);
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
      username: user.username,
      password: '',
      name: user.name,
      assigned_template_id: user.assigned_template_id || '',
      allowed_template_ids: user.allowed_template_ids || []
    });
    setIsModalOpen(true);
  };

  const openCreateLotteryModal = () => {
    setEditingLottery(null);
    setLotteryFormData({
        name: '',
        template_id: '',
        closing_time: '',
        is_active: true
    });
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
        name: lottery.name,
        template_id: lottery.template_id || '',
        closing_time: closingTimeStr,
        is_active: lottery.is_active
    });
    setIsLotteryModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ username: '', password: '', name: '', assigned_template_id: '', allowed_template_ids: [] });
  };

  const toggleAllowedTemplate = (templateId: string) => {
      const current = formData.allowed_template_ids;
      if (current.includes(templateId)) {
          setFormData({ ...formData, allowed_template_ids: current.filter(id => id !== templateId) });
      } else {
          setFormData({ ...formData, allowed_template_ids: [...current, templateId] });
      }
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
        
        <div className="flex gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-3 px-4 flex items-center gap-2 font-medium transition border-b-2 whitespace-nowrap ${
              activeTab === 'templates' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FaLayerGroup /> จัดการแม่พิมพ์ ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-4 flex items-center gap-2 font-medium transition border-b-2 whitespace-nowrap ${
              activeTab === 'users' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FaUsers /> จัดการสมาชิก ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('lotteries')}
            className={`pb-3 px-4 flex items-center gap-2 font-medium transition border-b-2 whitespace-nowrap ${
              activeTab === 'lotteries' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FaTicketAlt /> จัดการหวย ({lotteries.length})
          </button>
          <button
            onClick={() => setActiveTab('global')}
            className={`pb-3 px-4 flex items-center gap-2 font-medium transition border-b-2 whitespace-nowrap ${
              activeTab === 'global' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FaGlobe /> ค่ากลางระบบ
          </button>
        </div>

        {loading ? (
            <div className="text-center py-20 text-gray-400">
                กำลังโหลดข้อมูล... ⏳
            </div>
        ) : (
          <>
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">แม่พิมพ์ที่เลือกได้</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">แม่พิมพ์ปัจจุบัน</th>
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
                                {u.allowed_template_ids ? (
                                    <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                                        {u.allowed_template_ids.length} แบบ
                                    </span>
                                ) : <span className="text-gray-300">-</span>}
                            </td>
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

            {activeTab === 'lotteries' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-gray-700">จัดการหวยทั้งหมด ({lotteries.length})</h2>
                        {/* ✅ ปุ่มเพิ่มหวยใหม่ */}
                        <button 
                            onClick={openCreateLotteryModal}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 flex items-center gap-2"
                        >
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
                                {lotteries.map((lotto) => {
                                    return (
                                        <tr key={lotto.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{lotto.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {lotto.closing_time ? (
                                                    new Date(lotto.closing_time).toLocaleString('th-TH', { 
                                                        hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' 
                                                    })
                                                ) : <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${lotto.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {lotto.is_active ? 'เปิดใช้งาน' : 'ปิด'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => openEditLotteryModal(lotto)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-2 rounded-lg mr-2"><FaEdit /></button>
                                                {/* ✅ ปุ่มลบหวย */}
                                                <button onClick={() => handleDeleteLottery(lotto.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-lg"><FaTrash /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'global' && (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <FaGlobe className="text-blue-500" /> ตั้งค่ากลางของระบบ
                    </h2>
                    
                    <div className="space-y-8">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <FaLine className="text-green-500 text-lg" /> LINE ID กลาง
                            </label>
                            <input 
                                type="text"
                                value={globalConfigs.line_id}
                                onChange={(e) => setGlobalConfigs({ ...globalConfigs, line_id: e.target.value })}
                                placeholder="@yourlineid"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                            />
                            <p className="text-xs text-gray-500 mt-1">ข้อความนี้จะไปปรากฏในกล่อง "ข้อความ Line ID" ทุกแม่พิมพ์อัตโนมัติ</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <FaQrcode className="text-gray-800 text-lg" /> QR Code กลาง
                            </label>
                            
                            <div className="flex items-start gap-6">
                                <div className="w-40 h-40 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group">
                                    {globalConfigs.qr_code_url ? (
                                        <img src={globalConfigs.qr_code_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-gray-400 text-xs text-center p-2">ยังไม่มีรูป</div>
                                    )}
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={handleUploadQRCode}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition pointer-events-none">
                                        คลิกเพื่อเปลี่ยน
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-gray-600 mb-2">อัปโหลดรูป QR Code ที่จะใช้ร่วมกันทั้งระบบ</p>
                                    <p className="text-xs text-gray-400">รองรับไฟล์: .png, .jpg, .jpeg (ขนาดไม่เกิน 2MB)</p>
                                </div>
                            </div>
                        </div>

                        <hr />

                        <button 
                            onClick={handleSaveGlobalConfigs}
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition"
                        >
                            บันทึกการตั้งค่า
                        </button>
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
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                  <FaLayerGroup /> เลือกแม่พิมพ์ที่อนุญาตให้ใช้ (เลือกได้หลายอัน)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 p-2 rounded-lg bg-gray-50">
                    {templates.map(t => (
                        <div 
                            key={t.id} 
                            onClick={() => toggleAllowedTemplate(t.id)}
                            className={`p-2 rounded cursor-pointer border flex items-center gap-2 text-xs transition ${
                                formData.allowed_template_ids.includes(t.id) 
                                ? 'bg-blue-100 border-blue-300 text-blue-800' 
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            {formData.allowed_template_ids.includes(t.id) ? <FaCheckSquare className="text-blue-600" /> : <FaSquare className="text-gray-300" />}
                            <span className="truncate">{t.name}</span>
                        </div>
                    ))}
                </div>
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

      {isLotteryModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              {editingLottery ? <FaEdit /> : <FaPlus />} {editingLottery ? `แก้ไขหวย: ${editingLottery.name}` : 'เพิ่มหวยใหม่'}
            </h3>
            
            <form onSubmit={handleSaveLottery} className="space-y-4">
              
              {/* ✅ ชื่อหวย (แก้ไขได้) */}
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FaTicketAlt /> ชื่อหวย
                </label>
                <input 
                  type="text" 
                  value={lotteryFormData.name}
                  onChange={e => setLotteryFormData({...lotteryFormData, name: e.target.value})}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                  placeholder="เช่น หวยรัฐบาล"
                  required
                />
              </div>

              {/* ✅ เอาแม่พิมพ์ออกตาม Request */}
              
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FaClock /> เวลาปิดรับ (Closing Time)
                </label>
                <input 
                  type="datetime-local" 
                  value={lotteryFormData.closing_time}
                  onChange={e => setLotteryFormData({...lotteryFormData, closing_time: e.target.value})}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="flex items-center gap-2">
                <input 
                    type="checkbox"
                    id="is_active"
                    checked={lotteryFormData.is_active}
                    onChange={e => setLotteryFormData({...lotteryFormData, is_active: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">เปิดใช้งานหวยนี้</label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsLotteryModalOpen(false)}
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