import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Toolbox } from '../components/editor/Toolbox';
import { EditorCanvas } from '../components/editor/EditorCanvas';
import { Properties } from '../components/editor/Properties';
import { useEditorStore } from '../stores/useEditorStore';
import { FaSave, FaArrowLeft } from 'react-icons/fa';
import { apiClient } from '../config/api';
import { DEFAULT_CANVAS_CONFIG } from '../config/constants';
import type { Template } from '../types';

export const AdminEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    elements, canvasConfig, backgroundImage, 
    setElements, setCanvasSize, setBackgroundImage 
  } = useEditorStore();
  
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setElements([]);
      setCanvasSize(DEFAULT_CANVAS_CONFIG.width, DEFAULT_CANVAS_CONFIG.height);
      setBackgroundImage('');
      return;
    }

    const loadTemplate = async () => {
      setLoading(true);
      try {
        const data: Template = await apiClient.get(`/api/templates/${id}`);
        setCanvasSize(data.base_width, data.base_height);
        setBackgroundImage(data.background_url);
        
        const loadedElements = data.template_slots!.map((slot) => ({
          id: slot.id,
          type: 'text' as const,
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

  const handleSave = async () => {
    const name = prompt("ตั้งชื่อแม่พิมพ์หวยนี้:", "My Lotto Template");
    if (!name) return;

    setIsSaving(true);
    try {
      const payload = {
        name: name,
        width: canvasConfig.width,
        height: canvasConfig.height,
        background_url: backgroundImage,
        slots: elements.map(el => {
          let dbSlotType = 'system_label';
          if (el.dataKey) dbSlotType = 'auto_data';
          else if (el.type === 'text') dbSlotType = 'system_label';

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

      alert(`✅ ${id ? 'แก้ไข' : 'สร้าง'}แม่พิมพ์สำเร็จเรียบร้อย!`);
      navigate('/admin/dashboard');

    } catch (error: any) {
      console.error(error);
      alert("❌ เกิดข้อผิดพลาด: " + (error.message || error));
    } finally {
      setIsSaving(false);
    }
  };
  
  if (loading) return <div className="text-center p-20">กำลังโหลดข้อมูลเก่า...</div>;

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden relative">
      <div className="absolute top-4 left-4 z-50">
        {/* ✅ แก้: ปุ่มกลับ ให้ไปหน้า Admin Dashboard */}
        <button onClick={() => navigate('/admin/dashboard')} className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow text-gray-600 hover:text-blue-600 font-bold">
            <FaArrowLeft /> กลับ
        </button>
      </div>

      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-3 rounded-full shadow-lg text-white font-bold transition transform hover:scale-105 ${
            isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          <FaSave />
          {isSaving ? 'กำลังบันทึก...' : (id ? 'บันทึกการแก้ไข' : 'บันทึก Template ใหม่')}
        </button>
      </div>

      <div className="flex-none z-20 shadow-md">
        <Toolbox />
      </div>
      <div className="flex-1 relative z-0 bg-gray-200 overflow-hidden">
        <EditorCanvas />
      </div>
      <div className="flex-none z-20 shadow-md border-l border-gray-200">
        <Properties />
      </div>
    </div>
  );
};