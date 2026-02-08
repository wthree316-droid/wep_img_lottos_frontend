import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { EditorCanvas } from '../components/editor/EditorCanvas';
import { useEditorStore } from '../stores/useEditorStore';
import { FaArrowLeft, FaMagic, FaDownload, FaCalendarAlt } from 'react-icons/fa';
import { toPng } from 'html-to-image';
import { useAuth } from '../contexts/AuthContext';
import { preloadImage, waitForFonts } from '../utils/imageHelpers';
import { apiClient } from '../config/api';
import { IMAGE_CAPTURE_CONFIG, DATA_KEYS } from '../config/constants';
import type { GeneratePayload, GenerateResponse } from '../types';

const formatDateThai = (dateStr: string) => {
  if (!dateStr) return "{วันที่}";
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit'
  });
};

export const UserGeneratorPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  
  const { 
    setElements, setCanvasSize, setBackgroundImage, elements, updateElement, canvasConfig 
  } = useEditorStore();
  
  const [loading, setLoading] = useState(true);
  const [seed, setSeed] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!id) return;
    
    const loadData = async () => {
      try {
        const data = await apiClient.get(`/api/lotteries/${id}`);
        const lottery = data.lottery;
        let template = data.template;

        // 1. ลองใช้ Template ของ User ก่อน (Override)
        if (user?.assigned_template_id) {
          try {
            const userTemplate = await apiClient.get(`/api/templates/${user.assigned_template_id}`);
            template = userTemplate;
          } catch (e) {
            console.error("โหลดแม่พิมพ์สมาชิกไม่เจอ", e);
          }
        }

        // 2. ถ้าสุดท้ายยังไม่มี Template (ทั้งจากหวย และจาก User)
        if (!template) {
            alert("หวยรายการนี้ยังไม่ได้ผูกแม่พิมพ์ และคุณยังไม่ได้ตั้งค่าแม่พิมพ์ส่วนตัว");
            setLoading(false);
            return;
        }

        if (template.background_url) {
          await preloadImage(template.background_url);
        }

        setCanvasSize(template.base_width, template.base_height);
        setBackgroundImage(template.background_url);
        
        const loadedElements = template.template_slots.map((slot: any) => {
          let initialText = slot.label_text;
          if (slot.data_key === DATA_KEYS.LOTTERY_NAME) {
            initialText = lottery.name;
          } else if (slot.data_key === DATA_KEYS.LOTTERY_DATE) {
            initialText = formatDateThai(selectedDate);
          }

          return {
            id: slot.id,
            type: 'text',
            label_text: initialText,
            dataKey: slot.data_key,
            pos_x: slot.pos_x,
            pos_y: slot.pos_y,
            width: slot.width,
            height: slot.height,
            style_config: slot.style_config
          };
        });
        
        setElements(loadedElements);
        setLoading(false);
      } catch (err) {
        console.error(err);
        alert("ไม่พบข้อมูลหวยรายการนี้");
        setLoading(false);
      }
    };

    loadData();
  }, [id, user]);

  useEffect(() => {
    const dateElement = elements.find(el => el.dataKey === DATA_KEYS.LOTTERY_DATE);
    if (dateElement) {
      updateElement(dateElement.id, { label_text: formatDateThai(selectedDate) });
    }
  }, [selectedDate, elements.length]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const payload: GeneratePayload = {
        template_id: id!,
        user_seed: seed,
        slot_configs: elements.map(el => ({
          id: el.id,
          slot_type: el.dataKey ? 'user_input' : 'system_label',
          data_key: el.dataKey
        }))
      };

      const data: GenerateResponse = await apiClient.post('/api/generate', payload);
      
      // ✅ อัปเดตโดยเช็คจาก ID แทน dataKey (แก้ปัญหาเลขซ้ำ)
      elements.forEach(el => {
        if (el.dataKey && 
            el.dataKey !== DATA_KEYS.LOTTERY_NAME && 
            el.dataKey !== DATA_KEYS.LOTTERY_DATE) {
            
          // เช็คว่าใน results มีค่าของ ID นี้ไหม
          if (data.results[el.id]) {
            updateElement(el.id, { label_text: data.results[el.id] });
          }
        }
      });

    } catch (error: any) {
      alert("คำนวณพลาด: " + (error.message || error));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const node = document.getElementById('hidden-capture-canvas-single');
    if (!node) return;
    
    setIsDownloading(true);
    try {
      await waitForFonts();
      await new Promise(r => setTimeout(r, 300));

      const dataUrl = await toPng(node, IMAGE_CAPTURE_CONFIG);
      
      const link = document.createElement('a');
      link.download = `lotto-${seed || 'lucky'}-${selectedDate}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error(error);
      alert('บันทึกรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) return <div className="text-center p-20">กำลังโหลดแม่พิมพ์...</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-white p-4 shadow-sm flex items-center justify-between px-8">
        <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-blue-600">
          <FaArrowLeft /> กลับหน้าหลัก
        </Link>
        <h1 className="font-bold text-xl">เครื่องคำนวณหวย 🎰</h1>
        <div className="w-24"></div> 
      </div>

      <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden relative">
        <div className="w-full md:w-80 bg-white p-6 shadow-lg z-10 flex flex-col gap-6 overflow-y-auto relative">
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
             <label className="text-sm font-bold text-orange-900 mb-2 flex items-center gap-2">
               <FaCalendarAlt /> เลือกงวดวันที่
             </label>
             <input 
               type="date"
               value={selectedDate}
               onChange={(e) => setSelectedDate(e.target.value)}
               className="w-full p-2 border border-orange-200 rounded-lg text-gray-700 outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
             />
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <label className="block text-sm font-bold text-blue-900 mb-2">
              เลขตั้งต้น (Seed)
            </label>
            <input 
              type="text" 
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="เช่น รางวัลที่ 1..."
              className="w-full p-3 border border-blue-300 rounded-lg text-lg text-center font-mono tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg flex items-center justify-center gap-2 transition ${
              isGenerating ? 'bg-gray-400' : 'bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105'
            }`}
          >
            {isGenerating ? 'กำลังคำนวณ...' : <><FaMagic /> คำนวณสูตรหวย</>}
          </button>
          <hr />
          <button 
             onClick={handleDownload}
             disabled={isDownloading}
             className={`w-full py-3 border-2 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
               isDownloading 
                 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                 : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-green-600 hover:border-green-200'
             }`}
          >
             <FaDownload /> {isDownloading ? 'กำลังบันทึก...' : 'บันทึกรูปภาพ'}
          </button>
        </div>

        {/* Center: Preview (User มองเห็นอันนี้) */}
        <div className="flex-1 bg-gray-200 relative overflow-hidden flex items-center justify-center p-4 z-0">
             <div 
                id="lotto-ticket-preview" 
                className="shadow-2xl bg-white"
                style={{
                    height: '100%',
                    maxHeight: '90vh',
                    width: 'auto',
                    aspectRatio: `${canvasConfig.width} / ${canvasConfig.height}`
                }}
             >
                <div style={{ width: '100%', height: '100%' }}>
                    <EditorCanvas readOnly={true} />
                </div>
             </div>
        </div>

        <div
            id="hidden-capture-canvas-single"
            style={{
                position: 'fixed',
                top: 0,
                left: 0, 
                width: canvasConfig.width,
                height: canvasConfig.height,
                zIndex: -50, // ซ่อนไว้หลังสุด
                pointerEvents: 'none',
                
            }}
        >
            <EditorCanvas key={seed + selectedDate} readOnly={true} />
        </div>

      </div>
    </div>
  );
};