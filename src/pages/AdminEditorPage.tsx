import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Toolbox } from '../components/editor/Toolbox';
import { EditorCanvas } from '../components/editor/EditorCanvas';
import { Properties } from '../components/editor/Properties';
import { useEditorStore } from '../stores/useEditorStore';
import { FaSave, FaArrowLeft, FaCheckSquare, FaSquare, FaTrash, FaImage } from 'react-icons/fa';
import { apiClient } from '../config/api';
import { DEFAULT_CANVAS_CONFIG } from '../config/constants';
import type { Template, TemplateBackground } from '../types';

export const AdminEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    elements, canvasConfig, backgroundImage, 
    setElements, setCanvasSize, setBackgroundImage 
  } = useEditorStore();
  
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [templateName, setTemplateName] = useState("My Lotto Template");
  const [isMaster, setIsMaster] = useState(false);
  const [backgrounds, setBackgrounds] = useState<Partial<TemplateBackground>[]>([]);
  
  // ✅ 4. Checkbox "Use Original Size"
  const [useOriginalSize, setUseOriginalSize] = useState(false);

  useEffect(() => {
    if (!id) {
      setElements([]);
      setCanvasSize(DEFAULT_CANVAS_CONFIG.width, DEFAULT_CANVAS_CONFIG.height);
      setBackgroundImage('');
      setTemplateName("แม่พิมพ์ใหม่");
      setIsMaster(false);
      setBackgrounds([]);
      setUseOriginalSize(false);
      return;
    }

    const loadTemplate = async () => {
      setLoading(true);
      try {
        const data: Template = await apiClient.get(`/api/templates/${id}`);
        setTemplateName(data.name);
        setCanvasSize(data.base_width, data.base_height);
        setBackgroundImage(data.background_url);
        setIsMaster(data.is_master || false);
        
        if (data.template_backgrounds) {
            setBackgrounds(data.template_backgrounds);
        }

        const loadedElements = data.template_slots!.map((slot) => ({
          id: slot.id,
          type: (slot.slot_type === 'qr_code' ? 'qr_code' : slot.slot_type === 'static_text' ? 'static_text' : 'text') as any,
          label_text: slot.label_text,
          dataKey: slot.data_key || undefined,
          pos_x: slot.pos_x,
          pos_y: slot.pos_y,
          width: slot.width,
          height: slot.height,
          style_config: slot.style_config
        }));
        
        setElements(loadedElements);
        setLoading(false);
      } catch (err: any) {
        console.error(err);
        alert("โหลดข้อมูลไม่สำเร็จ: " + (err.message || err));
        navigate('/admin/dashboard');
      }
    };

    loadTemplate();
  }, [id]);

  // ✅ Effect: เมื่อเปลี่ยนรูปพื้นหลัง ถ้าติ๊ก "ใช้ขนาดจริง" ให้ปรับขนาด Canvas
  useEffect(() => {
    if (useOriginalSize && backgroundImage) {
        const img = new Image();
        img.src = backgroundImage;
        img.onload = () => {
            setCanvasSize(img.naturalWidth, img.naturalHeight);
        };
    }
  }, [backgroundImage, useOriginalSize]);

  const handleSave = async () => {
    if (!templateName) return alert("กรุณาตั้งชื่อแม่พิมพ์");

    setIsSaving(true);
    try {
      const payload = {
        name: templateName,
        width: canvasConfig.width,
        height: canvasConfig.height,
        background_url: backgroundImage,
        is_master: isMaster,
        backgrounds: backgrounds,
        slots: elements.map(el => {
          let dbSlotType = 'system_label';
          if (el.dataKey) dbSlotType = 'auto_data';
          
          if (el.type === 'qr_code') dbSlotType = 'qr_code';
          if (el.type === 'static_text') dbSlotType = 'static_text';

          if (el.type === 'text' && !el.dataKey) dbSlotType = 'system_label';

          return {
            id: el.id,
            type: dbSlotType,
            content: el.label_text,
            data_key: el.dataKey || "",
            x: el.pos_x,
            y: el.pos_y,
            width: el.width,
            height: el.height,
            style: el.style_config
          };
        })
      };

      if (id) {
        await apiClient.put(`/api/templates/${id}`, payload);
      } else {
        await apiClient.post('/api/templates', payload);
      }

      alert(`✅ บันทึกสำเร็จเรียบร้อย!`);
      navigate('/admin/dashboard');

    } catch (error: any) {
      console.error(error);
      alert("❌ เกิดข้อผิดพลาด: " + (error.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        
        setBackgrounds([...backgrounds, { name: `แบบที่ ${backgrounds.length + 1}`, url: data.url }]);
        
        if (!backgroundImage) setBackgroundImage(data.url);

    } catch (error: any) {
        alert("อัปโหลดไม่สำเร็จ: " + error.message);
    }
  };

  const removeBackground = (index: number) => {
    const newBgs = [...backgrounds];
    newBgs.splice(index, 1);
    setBackgrounds(newBgs);
  };
  
  if (loading) return <div className="text-center p-20">กำลังโหลดข้อมูลเก่า...</div>;

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden relative">
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin/dashboard')} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold">
                <FaArrowLeft /> กลับ
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <input 
                type="text" 
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="text-lg font-bold text-gray-800 outline-none border-b border-transparent hover:border-gray-300 focus:border-blue-500 bg-transparent px-2 py-1"
                placeholder="ชื่อแม่พิมพ์..."
            />
        </div>

        <div className="flex items-center gap-4">
            {/* ✅ Checkbox: Use Original Size */}
            <div 
                className="flex items-center gap-2 cursor-pointer select-none border-r border-gray-300 pr-4 mr-2"
                onClick={() => setUseOriginalSize(!useOriginalSize)}
            >
                {useOriginalSize ? <FaCheckSquare className="text-purple-600 text-xl" /> : <FaSquare className="text-gray-300 text-xl" />}
                <span className={`font-bold text-sm ${useOriginalSize ? 'text-purple-600' : 'text-gray-500'}`}>
                    ใช้ขนาดภาพจริง
                </span>
            </div>

            {/* Is Master Switch */}
            <div 
                className="flex items-center gap-2 cursor-pointer select-none"
                onClick={() => setIsMaster(!isMaster)}
            >
                {isMaster ? <FaCheckSquare className="text-blue-600 text-xl" /> : <FaSquare className="text-gray-300 text-xl" />}
                <span className={`font-bold ${isMaster ? 'text-blue-600' : 'text-gray-500'}`}>
                    แม่พิมพ์หลัก
                </span>
            </div>

            <button
                onClick={handleSave}
                disabled={isSaving}
                className={`flex items-center gap-2 px-6 py-2 rounded-full shadow text-white font-bold transition transform hover:scale-105 ${
                    isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                }`}
            >
                <FaSave />
                {isSaving ? 'บันทึก...' : 'บันทึกงาน'}
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex w-full h-full pt-16">
        <div className="flex-none z-20 shadow-md h-full">
            <Toolbox />
        </div>
        
        <div className="flex-1 relative z-0 bg-gray-200 overflow-hidden h-full flex flex-col">
            <EditorCanvas />
            
            {/* Background Manager Bar (Bottom) */}
            <div className="bg-white p-2 border-t border-gray-200 flex items-center gap-4 overflow-x-auto h-32 absolute bottom-0 w-full z-30">
                <div className="flex-none flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:bg-gray-50 cursor-pointer relative">
                    <FaImage size={24} />
                    <span className="text-xs mt-1">เพิ่มพื้นหลัง</span>
                    <input type="file" onChange={handleAddBackground} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>

                {/* Main Background */}
                <div className="relative group w-24 h-24 flex-none border-2 border-blue-500 rounded-lg overflow-hidden">
                    <img src={backgroundImage || "https://placehold.co/100"} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white text-[10px] text-center">รูปปัจจุบัน</div>
                </div>

                {/* Extra Backgrounds List */}
                {backgrounds.map((bg, idx) => (
                    <div key={idx} className="relative group w-24 h-24 flex-none border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition">
                        <img 
                            src={bg.url} 
                            className="w-full h-full object-cover cursor-pointer" 
                            onClick={() => setBackgroundImage(bg.url!)}
                        />
                        <input 
                            value={bg.name || ""} 
                            onChange={(e) => {
                                const newBgs = [...backgrounds];
                                newBgs[idx].name = e.target.value;
                                setBackgrounds(newBgs);
                            }}
                            className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center outline-none border-none p-0.5"
                        />
                        <button 
                            onClick={() => removeBackground(idx)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                        >
                            <FaTrash size={8} />
                        </button>
                    </div>
                ))}
            </div>
        </div>

        <div className="flex-none z-20 shadow-md border-l border-gray-200 h-full">
            <Properties />
        </div>
      </div>
    </div>
  );
};