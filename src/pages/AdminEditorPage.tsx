// src/pages/AdminEditorPage.tsx

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Toolbox } from '../components/editor/Toolbox';
import { EditorCanvas } from '../components/editor/EditorCanvas';
import { Properties } from '../components/editor/Properties';
import { useEditorStore } from '../stores/useEditorStore';
import { 
    FaSave, FaArrowLeft, FaCheckSquare, FaSquare, FaTrash, 
    FaImage, FaUserTag, FaTools, FaSlidersH, FaTimes, FaGripLines 
} from 'react-icons/fa';
import { apiClient } from '../config/api';
import { DEFAULT_CANVAS_CONFIG } from '../config/constants';
import type { Template, TemplateBackground } from '../types';

// 1. ปุ่มลอยตัวแบบลากได้ (Draggable FAB)
const DraggableFab = ({ align, onClick, icon, colorClass, title }: any) => {
    const [pos, setPos] = useState({ x: -100, y: -100 }); 
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

    useEffect(() => {
        setPos({
            x: align === 'left' ? 16 : window.innerWidth - 64,
            y: 90 
        });
    }, [align]);

    const handleStart = (e: any) => {
        e.stopPropagation(); 
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragStart.current = { x: clientX, y: clientY, px: pos.x, py: pos.y };
        isDragging.current = false;
    };

    const handleMove = (e: any) => {
        if (!dragStart.current.x) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const dx = clientX - dragStart.current.x;
        const dy = clientY - dragStart.current.y;
        
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragging.current = true;

        if (isDragging.current) {
            let newX = dragStart.current.px + dx;
            let newY = dragStart.current.py + dy;
            newX = Math.max(0, Math.min(newX, window.innerWidth - 50));
            newY = Math.max(80, Math.min(newY, window.innerHeight - 50));
            setPos({ x: newX, y: newY });
        }
    };

    const handleEnd = (e: any) => {
        e.stopPropagation(); 
        dragStart.current = { x: 0, y: 0, px: 0, py: 0 };
        setTimeout(() => { isDragging.current = false; }, 50); 
    };

    const handleClick = (e: any) => {
        e.stopPropagation(); 
        if (!isDragging.current) onClick();
    };

    if (pos.x === -100) return null;

    return (
        <button
            className={`md:hidden fixed z-55 p-4 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.15)] border bg-white transition-transform active:scale-95 cursor-grab active:cursor-grabbing ${colorClass}`}
            style={{ left: pos.x, top: pos.y, touchAction: 'none' }}
            onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd}
            onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
            onClick={handleClick}
            title={title}
        >
            {icon}
        </button>
    );
};

// 2. หน้าต่างเครื่องมือลอยตัวแบบลากได้
const DraggablePanel = ({ title, onClose, children, initialPos }: any) => {
    const [pos, setPos] = useState(initialPos); 
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

    const handleStart = (e: any) => {
        if (!e.target.closest('.drag-handle')) return; 
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragStart.current = { x: clientX, y: clientY, px: pos.x, py: pos.y };
        isDragging.current = true;
    };

    const handleMove = (e: any) => {
        if (!isDragging.current) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const dx = clientX - dragStart.current.x;
        const dy = clientY - dragStart.current.y;
        
        let newX = dragStart.current.px + dx;
        let newY = dragStart.current.py + dy;
        
        newX = Math.max(0, Math.min(newX, window.innerWidth - 100));
        newY = Math.max(64, Math.min(newY, window.innerHeight - 100));
        setPos({ x: newX, y: newY });
    };

    const handleEnd = () => isDragging.current = false;

    return (
        <div 
            className="fixed z-60 bg-white shadow-[0_15px_40px_rgba(0,0,0,0.25)] rounded-xl overflow-hidden flex flex-col md:hidden border border-gray-300"
            style={{ left: pos.x, top: pos.y, maxHeight: '80vh' }}
        >
            <div 
                className="drag-handle bg-gray-100 p-3 border-b border-gray-200 flex justify-between items-center cursor-move touch-none"
                onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd}
                onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
            >
                <span className="font-bold text-sm text-gray-700 flex items-center gap-2 pointer-events-none select-none">
                    <FaGripLines className="text-gray-400" /> {title}
                </span>
                <button onClick={onClose} className="text-gray-500 hover:text-red-500 p-1.5 bg-white rounded-lg shadow-sm border border-gray-200 active:bg-gray-50 transition">
                    <FaTimes />
                </button>
            </div>
            
            <div className="overflow-y-auto overscroll-contain flex-1 relative bg-white">
                {children}
            </div>
        </div>
    );
};

export const AdminEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ownerId = searchParams.get('owner_id');

  const { elements, canvasConfig, backgroundImage, setElements, setCanvasSize, setBackgroundImage } = useEditorStore();
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [templateName, setTemplateName] = useState("My Lotto Template");
  const [isMaster, setIsMaster] = useState(false);
  const [backgrounds, setBackgrounds] = useState<Partial<TemplateBackground>[]>([]);
  const [useOriginalSize, setUseOriginalSize] = useState(false);
  const [ownerName, setOwnerName] = useState<string | null>(null);

  const [activeDrawer, setActiveDrawer] = useState<'none' | 'tools' | 'props'>('none');

  useEffect(() => {
    if (ownerId) {
        apiClient.get(`/api/users/${ownerId}`).then(u => setOwnerName(u.name || u.username)).catch(() => {});
    }

    if (!id) {
      setElements([]);
      setCanvasSize(DEFAULT_CANVAS_CONFIG.width, DEFAULT_CANVAS_CONFIG.height);
      setBackgroundImage('');
      setTemplateName(ownerId ? `แม่พิมพ์ของ ${ownerId}` : "แม่พิมพ์ใหม่");
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
        
        if (data.template_backgrounds) setBackgrounds(data.template_backgrounds);
        if (data.owner_id) {
             apiClient.get(`/api/users/${data.owner_id}`).then(u => setOwnerName(u.name || u.username)).catch(() => {});
        }

        const loadedElements = data.template_slots!.map((slot) => ({
          id: slot.id, type: (slot.slot_type === 'qr_code' ? 'qr_code' : slot.slot_type === 'static_text' ? 'static_text' : 'text') as any,
          label_text: slot.label_text, dataKey: slot.data_key || undefined,
          pos_x: slot.pos_x, pos_y: slot.pos_y, width: slot.width, height: slot.height, style_config: slot.style_config
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
  }, [id, ownerId]);

  useEffect(() => {
    if (useOriginalSize && backgroundImage) {
        const img = new Image();
        img.src = backgroundImage;
        img.onload = () => setCanvasSize(img.naturalWidth, img.naturalHeight);
    }
  }, [backgroundImage, useOriginalSize]);

  const handleSave = async () => {
    if (!templateName) return alert("กรุณาตั้งชื่อแม่พิมพ์");
    setIsSaving(true);
    try {
      const payload = {
        name: templateName, width: canvasConfig.width, height: canvasConfig.height,
        background_url: backgroundImage, is_master: isMaster, backgrounds: backgrounds, owner_id: ownerId || null, 
        slots: elements.map(el => {
          let dbSlotType = 'system_label';
          if (el.dataKey) dbSlotType = 'auto_data';
          if (el.type === 'qr_code') dbSlotType = 'qr_code';
          if (el.type === 'static_text') dbSlotType = 'static_text';
          if (el.type === 'text' && !el.dataKey) dbSlotType = 'system_label';

          return {
            id: el.id, type: dbSlotType, content: el.label_text, data_key: el.dataKey || "",
            x: el.pos_x, y: el.pos_y, width: el.width, height: el.height, style: el.style_config
          };
        })
      };

      if (id) await apiClient.put(`/api/templates/${id}`, payload);
      else await apiClient.post('/api/templates', payload);

      alert(`✅ บันทึกสำเร็จเรียบร้อย!`);
      if (ownerId) navigate(`/admin/user/${ownerId}`);
      else navigate('/admin/dashboard');

    } catch (error: any) {
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
    } catch (error: any) { alert("อัปโหลดไม่สำเร็จ: " + error.message); }
  };

  const removeBackground = (index: number) => {
    const newBgs = [...backgrounds];
    newBgs.splice(index, 1);
    setBackgrounds(newBgs);
  };
  
  if (loading) return <div className="text-center p-20 flex flex-col items-center justify-center h-screen bg-gray-50"><div className="animate-spin text-4xl mb-4 text-blue-500">⏳</div>กำลังโหลดข้อมูลเก่า...</div>;

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden relative">
      
      {/* ❌ ลบฉากกั้นสีดำเบลอๆ ออกไปแล้ว! ทำให้กดข้างหลังได้อิสระ ❌ */}

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-30 px-3 md:px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 md:gap-4 w-1/2 md:w-auto">
            <button onClick={() => ownerId ? navigate(`/admin/user/${ownerId}`) : navigate('/admin/dashboard')} className="flex items-center gap-1 md:gap-2 text-gray-500 hover:text-blue-600 font-bold transition p-2 md:p-0 rounded-full hover:bg-gray-100 md:hover:bg-transparent">
                <FaArrowLeft /> <span className="hidden md:inline">กลับ</span>
            </button>
            <div className="h-6 w-px bg-gray-300 hidden md:block"></div>
            <div className="flex flex-col flex-1 min-w-0">
                <input 
                    type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)}
                    className="text-base md:text-lg font-bold text-gray-800 outline-none border-b border-transparent hover:border-gray-300 focus:border-blue-500 bg-transparent py-0.5 truncate w-full"
                    placeholder="ชื่อแม่พิมพ์..."
                />
                {ownerName && (
                    <span className="text-[10px] md:text-xs text-purple-600 font-medium flex items-center gap-1 truncate">
                        <FaUserTag className="shrink-0" /> สร้างให้: {ownerName}
                    </span>
                )}
            </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden lg:flex items-center gap-6 border-r border-gray-200 pr-6">
                <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => setUseOriginalSize(!useOriginalSize)}>
                    {useOriginalSize ? <FaCheckSquare className="text-purple-600 text-xl" /> : <FaSquare className="text-gray-300 text-xl group-hover:text-gray-400 transition" />}
                    <span className={`font-bold text-sm ${useOriginalSize ? 'text-purple-600' : 'text-gray-500'}`}>ใช้ขนาดภาพจริง</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => setIsMaster(!isMaster)}>
                    {isMaster ? <FaCheckSquare className="text-blue-600 text-xl" /> : <FaSquare className="text-gray-300 text-xl group-hover:text-gray-400 transition" />}
                    <span className={`font-bold text-sm ${isMaster ? 'text-blue-600' : 'text-gray-500'}`}>แม่พิมพ์หลัก</span>
                </div>
            </div>
            <button onClick={handleSave} disabled={isSaving} className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-full shadow-md text-white font-bold transition transform hover:scale-105 text-sm md:text-base ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'}`}>
                <FaSave /> {isSaving ? 'บันทึก...' : <span className="hidden sm:inline">บันทึกงาน</span>}
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex w-full h-full pt-16 relative">
        
        {/* Left Sidebar (Toolbox) - แสดงผลปกติในหน้าจอคอม */}
        <div className="hidden md:block flex-none z-20 shadow-md h-full">
            <Toolbox />
        </div>
        
        {/* Center Area (Canvas + Background Manager) */}
        <div className="flex-1 bg-gray-100 overflow-hidden h-full flex flex-col relative w-full">
            
            {/* Floating Buttons (แสดงเฉพาะบนมือถือ และโชว์เฉพาะตอนปิดลิ้นชัก) */}
            {activeDrawer === 'none' && (
                <>
                    <DraggableFab align="left" icon={<FaTools size={20} />} colorClass="text-blue-600 border-blue-100" onClick={() => setActiveDrawer('tools')} title="เปิดเครื่องมือ" />
                    <DraggableFab align="right" icon={<FaSlidersH size={20} />} colorClass="text-purple-600 border-purple-100" onClick={() => setActiveDrawer('props')} title="ตั้งค่าข้อความ" />
                </>
            )}

            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2 md:p-8">
                <EditorCanvas />
            </div>
            
            {/* Background Manager Bar (Bottom) */}
            <div className="bg-white p-3 border-t border-gray-200 flex items-center gap-3 overflow-x-auto h-28 md:h-32 w-full z-20 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex-none flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:bg-blue-50 hover:text-blue-500 hover:border-blue-400 transition cursor-pointer relative group">
                    <FaImage size={20} className="md:text-2xl" />
                    <span className="text-[10px] md:text-xs mt-1 font-medium">เพิ่มรูป</span>
                    <input type="file" onChange={handleAddBackground} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <div className="relative group w-20 h-20 md:w-24 md:h-24 flex-none border-2 border-blue-500 rounded-xl overflow-hidden shadow-sm">
                    <img src={backgroundImage || "https://placehold.co/100"} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-blue-600/90 backdrop-blur-sm text-white text-[9px] md:text-[10px] text-center py-0.5 font-bold">ปัจจุบัน</div>
                </div>
                {backgrounds.map((bg, idx) => (
                    <div key={idx} className="relative group w-20 h-20 md:w-24 md:h-24 flex-none border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-purple-300 transition">
                        <img src={bg.url} className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => setBackgroundImage(bg.url!)} />
                        <input value={bg.name || ""} onChange={(e) => { const newBgs = [...backgrounds]; newBgs[idx].name = e.target.value; setBackgrounds(newBgs); }} className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm text-white text-[9px] md:text-[10px] text-center outline-none border-none p-0.5" />
                        <button onClick={() => removeBackground(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-red-600">
                            <FaTrash size={10} />
                        </button>
                    </div>
                ))}
            </div>
        </div>

        {/* Right Sidebar (Properties) - แสดงผลปกติในหน้าจอคอม */}
        <div className="hidden md:block flex-none z-20 shadow-md border-l border-gray-200 h-full">
            <Properties />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 📱 ส่วนของ Mobile Draggable Panels (โผล่เฉพาะในจอมือถือ) */}
      {/* ========================================================= */}
      
      {activeDrawer === 'tools' && (
          <DraggablePanel 
              title="เพิ่มข้อความ" 
              initialPos={{ x: 10, y: 80 }} 
              onClose={() => setActiveDrawer('none')}
          >
              <div className="w-65 [&>div]:w-full [&>div]:border-none">
                  <Toolbox />
              </div>
          </DraggablePanel>
      )}

      {activeDrawer === 'props' && (
          <DraggablePanel 
              title="ตั้งค่า (Properties)" 
              initialPos={{ x: typeof window !== 'undefined' && window.innerWidth > 320 ? window.innerWidth - 320 : 10, y: 80 }} 
              onClose={() => setActiveDrawer('none')}
          >
              <div className="w-[85vw] max-w-77.5 [&>div]:w-full [&>div]:border-none flex flex-col">
                  
                  {/* นำปุ่มตั้งค่าแม่พิมพ์ 2 อันมาซ่อนไว้ในลิ้นชักของมือถือ */}
                  <div className="md:hidden flex flex-row justify-between p-3 bg-purple-50 border-b border-purple-100">
                        <div 
                            className="flex items-center gap-1.5 cursor-pointer select-none"
                            onClick={() => setUseOriginalSize(!useOriginalSize)}
                        >
                            {useOriginalSize ? <FaCheckSquare className="text-purple-600 text-lg" /> : <FaSquare className="text-gray-300 text-lg" />}
                            <span className="font-bold text-[11px] text-gray-700">ใช้ขนาดภาพจริง</span>
                        </div>
                        <div 
                            className="flex items-center gap-1.5 cursor-pointer select-none"
                            onClick={() => setIsMaster(!isMaster)}
                        >
                            {isMaster ? <FaCheckSquare className="text-blue-600 text-lg" /> : <FaSquare className="text-gray-300 text-lg" />}
                            <span className="font-bold text-[11px] text-gray-700">แม่พิมพ์หลัก</span>
                        </div>
                  </div>

                  <Properties />
              </div>
          </DraggablePanel>
      )}

    </div>
  );
};