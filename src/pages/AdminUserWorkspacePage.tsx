// src/pages/AdminUserWorkspacePage.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    FaArrowLeft, FaSave, FaQrcode, FaLine, FaPlus, 
    FaTrash, FaEdit, FaImage, FaUserCog, FaCloudUploadAlt, FaCheckCircle 
} from 'react-icons/fa';
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
      const userData = await apiClient.get<User>(`/api/users/${userId}`);
      setUser(userData);
      setCustomLineId(userData.custom_line_id || '');
      setCustomQrUrl(userData.custom_qr_code_url || '');

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
    if (!confirm("⚠️ ยืนยันการลบแม่พิมพ์นี้?\nข้อมูลจะถูกลบถาวรและไม่สามารถกู้คืนได้")) return;
    try {
      await apiClient.delete(`/api/templates/${templateId}`);
      setTemplates(templates.filter(t => t.id !== templateId));
    } catch (error: any) {
      alert("ลบไม่สำเร็จ: " + error.message);
    }
  };

  if (loading) return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
          <div className="animate-spin text-4xl mb-4 text-blue-500">⏳</div>
          <div className="text-gray-500 font-bold">กำลังโหลดข้อมูลสมาชิก...</div>
      </div>
  );
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* 🌟 Header (Sticky + Glassmorphism) */}
      <div className="bg-white/90 backdrop-blur-md shadow-sm border-b px-4 md:px-8 py-3 md:py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3 md:gap-5 w-full">
          <Link to="/admin/dashboard" className="text-gray-500 hover:text-blue-600 flex items-center gap-2 font-bold p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
            <FaArrowLeft /> <span className="hidden sm:inline">หน้าหลักแอดมิน</span>
          </Link>
          <div className="h-8 w-px bg-gray-300 hidden md:block"></div>
          
          {/* User Info Profile */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
             <div className="w-10 h-10 md:w-12 md:h-12 bg-linear-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
             </div>
             <div className="min-w-0">
                <h1 className="text-base md:text-xl font-bold text-gray-800 flex items-center gap-2 truncate">
                  {user.username}
                  <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-blue-200 shrink-0">
                      {user.role.toUpperCase()}
                  </span>
                </h1>
                <p className="text-xs text-gray-500 truncate">สมาชิก: {user.name}</p>
             </div>
          </div>
        </div>
      </div>

      {/* 🌟 Main Content Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* ======================================= */}
        {/* Left Column: Personal Configs (ตั้งค่าส่วนตัว) */}
        {/* ======================================= */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2 text-lg">
              <FaUserCog className="text-blue-500" /> ตั้งค่าส่วนตัวของสมาชิก
            </h2>
            
            <div className="space-y-5">
              {/* Line ID Input */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <FaLine className="text-green-500 text-lg" /> Line ID
                </label>
                <input 
                  type="text"
                  value={customLineId}
                  onChange={(e) => setCustomLineId(e.target.value)}
                  placeholder="เช่น @user01 (ปล่อยว่างใช้ค่าระบบ)"
                  className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 outline-none transition shadow-sm"
                />
              </div>

              {/* QR Code Upload */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <label className="text-sm font-bold text-gray-700 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2"><FaQrcode className="text-blue-500 text-lg" /> QR Code ชำระเงิน</span>
                  {customQrUrl && <FaCheckCircle className="text-green-500" title="อัปโหลดแล้ว" />}
                </label>
                
                <div className="relative group w-full aspect-square bg-white rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-blue-400 transition cursor-pointer shadow-sm">
                   {customQrUrl ? (
                     <>
                        <img src={customQrUrl} className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none backdrop-blur-sm">
                            <FaCloudUploadAlt className="text-3xl mb-2" />
                            <span className="text-sm font-bold">เปลี่ยนรูป QR Code</span>
                        </div>
                     </>
                   ) : (
                     <div className="text-center text-gray-400 group-hover:text-blue-500 transition-colors">
                       <FaImage className="mx-auto text-4xl mb-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                       <span className="text-sm font-medium">คลิกอัปโหลด QR Code</span>
                     </div>
                   )}
                   <input 
                      type="file" accept="image/*" onChange={handleUploadQr}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                   />
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className={`w-full py-3.5 rounded-xl font-bold text-white shadow-md transition transform active:scale-95 flex justify-center items-center gap-2 ${
                  isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg'
                }`}
              >
                {isSaving ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div> : <FaSave />}
                {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
              </button>
            </div>
          </div>
        </div>

        {/* ======================================= */}
        {/* Right Column: Personal Templates (แม่พิมพ์ส่วนตัว) */}
        {/* ======================================= */}
        <div className="lg:col-span-2 flex flex-col h-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
                <h2 className="font-bold text-xl md:text-2xl text-gray-800 flex items-center gap-2">
                🎨 แม่พิมพ์ของ {user.name}
                </h2>
                <p className="text-gray-500 text-sm mt-1">มีแม่พิมพ์ทั้งหมด {templates.length} รายการ</p>
            </div>
            
            <Link 
              to={`/admin/create?owner_id=${user.id}`} 
              className="bg-linear-to-r from-purple-500 to-pink-600 text-white px-5 py-3 rounded-xl shadow-md hover:shadow-lg hover:from-purple-600 hover:to-pink-700 flex items-center justify-center gap-2 font-bold transition transform hover:scale-[1.02] active:scale-95"
            >
              <FaPlus /> สร้างแม่พิมพ์ใหม่
            </Link>
          </div>

          {/* Empty State */}
          {templates.length === 0 ? (
            <div className="flex-1 bg-white rounded-2xl p-10 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 text-gray-400 shadow-sm min-h-75">
               <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                   <FaImage className="text-3xl text-gray-300" />
               </div>
               <h3 className="text-lg font-bold text-gray-600">ยังไม่มีแม่พิมพ์ส่วนตัว</h3>
               <p className="text-sm mt-1 text-center max-w-sm">
                   คลิกปุ่ม "สร้างแม่พิมพ์ใหม่" ด้านบนเพื่อเริ่มสร้างแม่พิมพ์ให้สมาชิกคนนี้ได้ทันที
               </p>
            </div>
          ) : (
            /* Templates Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6 pb-10">
              {templates.map(t => (
                <div key={t.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-xl hover:border-purple-200 transition-all duration-300 flex flex-col">
                   {/* Thumbnail */}
                   <div className="aspect-3/4 bg-gray-100 relative overflow-hidden">
                      {t.background_url ? (
                        <img src={t.background_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                            <FaImage className="text-4xl opacity-20" />
                            <span className="text-xs font-medium">ไม่มีรูปพื้นหลัง</span>
                        </div>
                      )}
                      
                      {/* Gradient Overlay for Text Readability */}
                      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                      
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-purple-700 text-[10px] px-2.5 py-1 rounded-full shadow-sm font-bold uppercase tracking-wider">
                        แม่พิมพ์ส่วนตัว
                      </div>
                   </div>

                   {/* Card Content & Actions */}
                   <div className="p-4 flex flex-col gap-4 bg-white z-10 relative">
                      <h3 className="font-bold text-gray-800 text-sm md:text-base truncate" title={t.name}>{t.name}</h3>
                      
                      <div className="flex gap-2">
                        <Link 
                          to={`/admin/editor/${t.id}?owner_id=${user.id}`}
                          className="flex-1 bg-purple-50 text-purple-700 py-2.5 rounded-lg text-center hover:bg-purple-600 hover:text-white font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition"
                        >
                          <FaEdit /> แก้ไข
                        </Link>
                        <button 
                          onClick={() => handleDeleteTemplate(t.id)}
                          className="px-3 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition"
                          title="ลบแม่พิมพ์"
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