// src/pages/AdminUserWorkspacePage.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaSave, FaQrcode, FaLine, FaPlus, FaTrash, FaEdit, FaImage, FaUserCog } from 'react-icons/fa';
import { apiClient } from '../config/api';
import type { User, Template } from '../types';

export const AdminUserWorkspacePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState<User | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [customLineId, setCustomLineId] = useState('');
  const [customQrUrl, setCustomQrUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. ดึงข้อมูล User (รวม Config ส่วนตัว)
      const userData = await apiClient.get<User>(`/api/users/${userId}`);
      setUser(userData);
      setCustomLineId(userData.custom_line_id || '');
      setCustomQrUrl(userData.custom_qr_code_url || '');

      // 2. ดึงแม่พิมพ์ของ User คนนี้ (ส่ง owner_id ไป filter)
      const userTemplates = await apiClient.get<Template[]>(`/api/templates?owner_id=${userId}`);
      setTemplates(userTemplates);

      setLoading(false);
    } catch (error) {
      console.error(error);
      alert("โหลดข้อมูลไม่สำเร็จ");
      navigate('/admin/dashboard');
    }
  };

  const handleSaveConfig = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await apiClient.put(`/api/users/${user.id}`, {
        custom_line_id: customLineId,
        custom_qr_code_url: customQrUrl
      });
      alert("✅ บันทึกการตั้งค่าส่วนตัวเรียบร้อย");
    } catch (error: any) {
      alert("❌ บันทึกไม่สำเร็จ: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadQr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      
      const data = await res.json();
      setCustomQrUrl(data.url);
    } catch (error: any) {
      alert("อัปโหลด QR Code ไม่ผ่าน: " + error.message);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("ยืนยันลบแม่พิมพ์นี้? (กู้คืนไม่ได้)")) return;
    try {
      await apiClient.delete(`/api/templates/${templateId}`);
      setTemplates(templates.filter(t => t.id !== templateId));
    } catch (error: any) {
      alert("ลบไม่สำเร็จ: " + error.message);
    }
  };

  if (loading) return <div className="text-center p-20">กำลังโหลดข้อมูลสมาชิก...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-8 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link to="/admin/dashboard" className="text-gray-500 hover:text-blue-600 flex items-center gap-2">
            <FaArrowLeft /> กลับ
          </Link>
          <div className="h-6 w-px bg-gray-300"></div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FaUserCog className="text-blue-600" /> พื้นที่จัดการ: {user.username}
            </h1>
            <p className="text-xs text-gray-500">ชื่อเล่น: {user.name} | Role: {user.role}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Personal Configs */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2 border-b pb-2">
              ⚙️ ตั้งค่าส่วนตัว
            </h2>
            
            <div className="space-y-6">
              {/* Line ID Input */}
              <div>
                <label className="text-sm font-bold text-gray-600 mb-2 flex items-center gap-2">
                  <FaLine className="text-green-500" /> Line ID ของ {user.name}
                </label>
                <input 
                  type="text"
                  value={customLineId}
                  onChange={(e) => setCustomLineId(e.target.value)}
                  placeholder="เช่น @user01 (ถ้าว่างจะใช้ค่ากลาง)"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  * ถ้าไม่ใส่ ระบบจะดึง Line ID กลางมาแสดงแทน
                </p>
              </div>

              {/* QR Code Upload */}
              <div>
                <label className="text-sm font-bold text-gray-600 mb-2 flex items-center gap-2">
                  <FaQrcode className="text-blue-500" /> QR Code ของ {user.name}
                </label>
                
                <div className="relative group w-full aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:bg-gray-50 transition cursor-pointer">
                   {customQrUrl ? (
                     <img src={customQrUrl} className="w-full h-full object-contain p-2" />
                   ) : (
                     <div className="text-center text-gray-400">
                       <FaImage className="mx-auto text-3xl mb-2 opacity-50" />
                       <span className="text-xs">คลิกเพื่ออัปโหลด QR</span>
                     </div>
                   )}
                   <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleUploadQr}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                   />
                   <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition pointer-events-none text-sm font-bold">
                      เปลี่ยนรูป
                   </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 text-center">
                  * ถ้าไม่มีรูป ระบบจะใช้ QR Code กลาง
                </p>
              </div>

              <button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className={`w-full py-3 rounded-lg font-bold text-white shadow transition ${
                  isSaving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <FaSave className="inline mr-2" />
                {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Personal Templates */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-xl text-gray-800 flex items-center gap-2">
              🎨 แม่พิมพ์ของ {user.name} ({templates.length})
            </h2>
            
            {/* ปุ่มสร้างแม่พิมพ์ใหม่ โดยส่ง owner_id ไปด้วย */}
            <Link 
              to={`/admin/create?owner_id=${user.id}`} 
              className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 flex items-center gap-2 font-bold transition transform hover:scale-105"
            >
              <FaPlus /> สร้างแม่พิมพ์ให้ {user.name}
            </Link>
          </div>

          {templates.length === 0 ? (
            <div className="bg-white rounded-xl p-10 text-center border-2 border-dashed border-gray-300 text-gray-400">
               <FaImage className="text-5xl mx-auto mb-4 opacity-20" />
               <p>ยังไม่มีแม่พิมพ์ส่วนตัว</p>
               <p className="text-sm mt-2">กดปุ่ม "สร้างแม่พิมพ์" ด้านบนเพื่อเริ่มสร้าง</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates.map(t => (
                <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group hover:shadow-md transition">
                   <div className="aspect-video bg-gray-100 relative">
                      {t.background_url ? (
                        <img src={t.background_url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-300 text-sm">No Image</div>
                      )}
                      <div className="absolute top-2 right-2 bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full shadow">
                        ส่วนตัว
                      </div>
                   </div>
                   <div className="p-4">
                      <h3 className="font-bold text-gray-800 truncate">{t.name}</h3>
                      <div className="flex gap-2 mt-4">
                        <Link 
                          to={`/admin/editor/${t.id}?owner_id=${user.id}`}
                          className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg text-center hover:bg-blue-50 hover:text-blue-600 font-medium text-sm flex items-center justify-center gap-1 transition"
                        >
                          <FaEdit /> แก้ไข
                        </Link>
                        <button 
                          onClick={() => handleDeleteTemplate(t.id)}
                          className="px-4 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition border border-red-100"
                        >
                          <FaTrash />
                        </button>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};