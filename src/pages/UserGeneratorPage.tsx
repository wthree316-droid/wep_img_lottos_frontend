import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { EditorCanvas } from '../components/editor/EditorCanvas';
import { useEditorStore } from '../stores/useEditorStore';
import { 
    FaArrowLeft, FaMagic, FaDownload, FaCalendarAlt, 
    FaPalette, FaUserCircle, FaCheck 
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { preloadImage, waitForFonts } from '../utils/imageHelpers';
import { apiClient } from '../config/api';
import { DATA_KEYS } from '../config/constants';
import type { GeneratePayload, GenerateResponse, Template, User } from '../types';
import toast from 'react-hot-toast';

const formatDateThai = (dateStr: string) => {
  if (!dateStr) return "{วันที่}";
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit'
  });
};

// Konva จัดการเรื่อง Scale ให้แล้ว ฟังก์ชันนี้คืนค่าเดิมกลับไปได้เลย
const calculateScaledFontSize = (designFontSize: number) => {
  return designFontSize; 
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
  
  const [templateData, setTemplateData] = useState<Template | null>(null);
  const [activeBgId, setActiveBgId] = useState<string>('default');

  const stageRef = useRef<any>(null);

  useEffect(() => {
    if (!id || !user) return;
    
    const loadData = async () => {
      try {
        const data = await apiClient.get(`/api/lotteries/${id}`);
        const lottery = data.lottery;
        let template = data.template;

        try {
            const freshUser = await apiClient.get<User>(`/api/users/${user.id}`);
            if (freshUser.assigned_template_id) {
                try {
                    const userTemplate = await apiClient.get(`/api/templates/${freshUser.assigned_template_id}`);
                    template = userTemplate;
                } catch (e) { console.error("โหลดแม่พิมพ์สมาชิกไม่เจอ", e); }
            }
        } catch (e) {
             console.warn("Could not fetch fresh user data", e);
             if (user.assigned_template_id) {
                 try {
                    const userTemplate = await apiClient.get(`/api/templates/${user.assigned_template_id}`);
                    template = userTemplate;
                 } catch (e) { console.error("โหลดแม่พิมพ์สมาชิกไม่เจอ", e); }
             }
        }

        if (!template) {
            toast.error("ไม่พบแม่พิมพ์สำหรับหวยรายการนี้");
            setLoading(false);
            return;
        }

        let ownerLineId = "";
        let ownerQrUrl = "";
        
        if (template.owner_id) {
            try {
                const owner = await apiClient.get<User>(`/api/users/${template.owner_id}`);
                ownerLineId = owner.custom_line_id || "";
                ownerQrUrl = owner.custom_qr_code_url || "";
            } catch (e) {
                console.error("Failed to load template owner config", e);
            }
        }

        setTemplateData(template);

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
          else if (slot.data_key === DATA_KEYS.LINE_ID) {
             initialText = ownerLineId || "{Line ID}";
          }
          else if (slot.data_key === DATA_KEYS.QR_CODE) {
             initialText = ownerQrUrl || ""; 
          }

          const scaledFontSize = calculateScaledFontSize(slot.style_config.fontSize);

          return {
            id: slot.id,
            type: slot.slot_type === 'qr_code' ? 'qr_code' : (slot.slot_type === 'static_text' ? 'static_text' : 'text'),
            label_text: initialText,
            dataKey: slot.data_key,
            pos_x: slot.pos_x,
            pos_y: slot.pos_y,
            width: slot.width,
            height: slot.height,
            style_config: {
              ...slot.style_config,
              fontSize: scaledFontSize
            }
          };
        });
        
        setElements(loadedElements);
        setLoading(false);
      } catch (err) {
        console.error(err);
        toast.error("โหลดข้อมูลผิดพลาด");
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
        template_id: templateData?.id || id!,
        user_seed: seed,
        target_user_id: templateData?.owner_id || user?.id, 
        slot_configs: elements.map(el => {
            let slotType = 'system_label';
            
            if (el.type === 'qr_code' || el.dataKey === DATA_KEYS.QR_CODE) {
                slotType = 'qr_code';
            } else if (el.type === 'static_text' || el.dataKey === DATA_KEYS.LINE_ID) {
                slotType = 'static_text';
            } 
            else if (el.dataKey === DATA_KEYS.LOTTERY_NAME || el.dataKey === DATA_KEYS.LOTTERY_DATE) {
                slotType = 'system_label'; 
            }
            else if (el.dataKey) {
                slotType = 'user_input'; 
            }
            
            return {
                id: el.id,
                slot_type: slotType as any,
                data_key: el.dataKey
            };
        })
      };

      const data: GenerateResponse = await apiClient.post('/api/generate', payload);
      
      elements.forEach(el => {
        if (data.results[el.id]) {
           updateElement(el.id, { label_text: data.results[el.id] });
        }
      });

    } catch (error: any) {
      toast.error("คำนวณพลาด: " + (error.message || error));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!stageRef.current) return;
    
    setIsDownloading(true);
    try {
      await waitForFonts();
      await new Promise(r => setTimeout(r, 500)); 

      const dataUrl = stageRef.current.toDataURL({
          pixelRatio: 2,
          mimeType: 'image/png'
      });
      
      const link = document.createElement('a');
      link.download = `lotto-${seed || 'lucky'}-${selectedDate}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error(error);
      toast.error('บันทึกรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSelectBackground = (url: string, bgId: string) => {
    setActiveBgId(bgId);
    setBackgroundImage(url);
  };

  // 🔄 หน้าจอ Loading แบบเรียบหรู
  if (loading) return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin mb-4"></div>
          <div className="text-[#D4AF37] font-bold tracking-widest uppercase text-sm">กำลังเปิดห้องทำงาน...</div>
      </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col font-sans text-white">
      
      {/* 🧭 Header (Navbar) - ดำตัดขอบทอง เรียบๆ */}
      <div className="bg-[#121212] h-16 border-b border-[#D4AF37]/20 flex items-center justify-between px-4 md:px-8 z-30 shrink-0">
        <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-[#D4AF37] font-bold transition p-2 rounded-lg hover:bg-[#1a1a1a]">
          <FaArrowLeft /> <span className="hidden sm:inline">กลับหน้าหลัก</span>
        </Link>
        <h1 className="font-black text-lg md:text-xl flex items-center gap-2 bg-linear-to-r from-[#FCF6BA] via-[#D4AF37] to-[#BF953F] bg-clip-text text-transparent uppercase tracking-wider">
           สร้างใบแนวทาง
        </h1>
        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-400 bg-[#0a0a0a] px-3 py-1.5 rounded-full border border-[#D4AF37]/20">
             <FaUserCircle className="text-[#D4AF37]" />
             <span className="hidden sm:inline">ผู้ใช้งาน:</span>
             <span className="font-bold text-[#D4AF37] truncate max-w-20 sm:max-w-32">{user?.name || user?.username}</span>
        </div>
      </div>

      {/* 🌟 Main Workspace (เรียบ นิ่ง ไม่มีแอนิเมชันรบกวน) */}
      <div className="flex-1 flex flex-col md:flex-row relative md:h-[calc(100vh-64px)] overflow-y-auto md:overflow-hidden bg-[#050505]">

        {/* ==================================================== */}
        {/* 1. LEFT SIDEBAR (แผงควบคุมด้านซ้าย) */}
        {/* ==================================================== */}
        <div className="order-2 md:order-1 w-full md:w-80 bg-[#121212] z-20 flex flex-col md:h-full md:overflow-y-auto border-t md:border-t-0 md:border-r border-[#D4AF37]/20 shrink-0">
          <div className="p-6 flex flex-col gap-6">

            {/* Date Selection */}
            <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-[#D4AF37]/20">
               <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest mb-3 flex items-center gap-2">
                 <FaCalendarAlt /> เลือกงวดวันที่
               </label>
               <input 
                 type="date"
                 value={selectedDate}
                 onChange={(e) => setSelectedDate(e.target.value)}
                 className="w-full p-2.5 bg-[#1a1a1a] border border-gray-800 rounded-xl text-white outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] cursor-pointer shadow-inner scheme-dark"
               />
            </div>

            {/* Seed Selection */}
            <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-[#D4AF37]/20">
              <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest mb-3 flex items-center gap-2">
                <FaMagic /> เลขตั้งต้น (Seed)
              </label>
              <input 
                type="text" 
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="สุ่มอัตโนมัติถ้าปล่อยว่าง"
                className="w-full p-3 bg-[#1a1a1a] border border-gray-800 rounded-xl text-lg text-center font-mono tracking-widest focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none shadow-inner placeholder:text-gray-600 text-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-2">
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className={`w-full py-4 rounded-xl font-black uppercase tracking-wider text-black text-[15px] flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    isGenerating ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-linear-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] hover:brightness-110 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                  }`}
                >
                  {isGenerating ? (
                      <><div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div> กำลังคำนวณ...</>
                  ) : <><FaMagic /> คำนวณสูตรหวย</>}
                </button>

                <button 
                   onClick={handleDownload}
                   disabled={isDownloading}
                   className={`w-full py-3.5 border-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                     isDownloading 
                       ? 'bg-[#1a1a1a] text-gray-600 border-gray-800 cursor-not-allowed'
                       : 'bg-transparent border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10'
                   }`}
                >
                   <FaDownload /> {isDownloading ? 'กำลังบันทึก...' : 'บันทึกรูปภาพ'}
                </button>
            </div>

          </div>
        </div>

        {/* ==================================================== */}
        {/* 2. CENTER PREVIEW (กระดานวาดภาพตรงกลาง) */}
        {/* ==================================================== */}
        <div className="order-1 md:order-2 w-full h-[55vh] md:h-full md:flex-1 flex items-center justify-center p-4 md:p-8 z-10 shrink-0 relative bg-[#050505]">
             <div 
                className="shadow-[0_0_40px_rgba(212,175,55,0.1)] rounded-md overflow-hidden transition-transform duration-300 border border-[#D4AF37]/20"
                style={{
                    height: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    aspectRatio: `${canvasConfig.width} / ${canvasConfig.height}`,
                    backgroundColor: '#121212' // สีพื้นของ Canvas ก่อนภาพโหลด
                }}
             >
                <div style={{ width: '100%', height: '100%' }}>
                    <EditorCanvas readOnly={true} onStageRef={(ref) => (stageRef.current = ref)} />
                </div>
             </div>
        </div>

        {/* ==================================================== */}
        {/* 3. RIGHT SIDEBAR (แผงเลือกพื้นหลังด้านขวา) */}
        {/* ==================================================== */}
        {(templateData?.template_backgrounds && templateData.template_backgrounds.length > 0) && (
            <div className="order-3 md:order-3 w-full md:w-72 bg-[#121212] z-20 flex flex-col md:h-full md:overflow-y-auto border-t md:border-t-0 md:border-l border-[#D4AF37]/20 shrink-0">
                <div className="p-6">
                    <h3 className="font-bold text-white mb-6 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <FaPalette className="text-[#D4AF37]" /> เลือกธีมพื้นหลัง
                    </h3>
                    
                    <div className="grid grid-cols-3 md:grid-cols-2 gap-4 pb-6">
                        
                        {/* Default Background */}
                        <div 
                            onClick={() => handleSelectBackground(templateData.background_url, 'default')}
                            className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all relative aspect-9/16 group bg-[#0a0a0a] ${
                                activeBgId === 'default' ? 'border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'border-transparent hover:border-gray-600'
                            }`}
                        >
                            <img src={templateData.background_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black to-transparent pt-6 pb-2 px-1 text-gray-300 text-[10px] text-center truncate font-medium">
                                มาตรฐาน
                            </div>
                            {activeBgId === 'default' && (
                                <div className="absolute top-2 right-2 bg-linear-to-tr from-[#BF953F] to-[#FCF6BA] text-black rounded-full p-1 shadow-md">
                                    <FaCheck size={10} />
                                </div>
                            )}
                        </div>

                        {/* Alternative Backgrounds */}
                        {templateData.template_backgrounds.map((bg: any) => (
                            <div 
                                key={bg.id}
                                onClick={() => handleSelectBackground(bg.url, bg.id)}
                                className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all relative aspect-9/16 group bg-[#0a0a0a] ${
                                    activeBgId === bg.id ? 'border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'border-transparent hover:border-gray-600'
                                }`}
                            >
                                <img src={bg.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black to-transparent pt-6 pb-2 px-1 text-gray-300 text-[10px] text-center truncate font-medium">
                                    {bg.name}
                                </div>
                                {activeBgId === bg.id && (
                                    <div className="absolute top-2 right-2 bg-linear-to-tr from-[#BF953F] to-[#FCF6BA] text-black rounded-full p-1 shadow-md">
                                        <FaCheck size={10} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Hidden Canvas สำหรับ Export (ห้ามลบเด็ดขาด) */}
        <div
            id="hidden-capture-canvas-single"
            style={{
                position: 'fixed',
                top: 0,
                left: 0, 
                width: canvasConfig.width,
                height: canvasConfig.height,
                zIndex: -50,
                pointerEvents: 'none',
            }}
        >
            <EditorCanvas key={seed + selectedDate + activeBgId} readOnly={true} />
        </div>

      </div>
    </div>
  );
};