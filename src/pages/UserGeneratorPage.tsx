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
            alert("ไม่พบแม่พิมพ์สำหรับหวยรายการนี้");
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
        alert("โหลดข้อมูลผิดพลาด");
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
      alert("คำนวณพลาด: " + (error.message || error));
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
      alert('บันทึกรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSelectBackground = (url: string, bgId: string) => {
    setActiveBgId(bgId);
    setBackgroundImage(url);
  };

  if (loading) return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
          <div className="animate-spin text-4xl mb-4 text-blue-500">⏳</div>
          <div className="text-gray-500 font-bold">กำลังโหลดแม่พิมพ์...</div>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* Header */}
      <div className="bg-white h-16 shadow-sm flex items-center justify-between px-4 md:px-8 z-30 relative shrink-0">
        <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition p-2 rounded-lg hover:bg-gray-50">
          <FaArrowLeft /> <span className="hidden sm:inline">กลับหน้าหลัก</span>
        </Link>
        <h1 className="font-bold text-lg md:text-xl text-gray-800 flex items-center gap-2">
           เครื่องคำนวณหวย 🎰
        </h1>
        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
             <FaUserCircle className="text-gray-400 text-lg" />
             <span className="hidden sm:inline">เล่นโดย:</span>
             <span className="font-bold text-blue-600 truncate max-w-20 sm:max-w-37.5">{user?.name}</span>
        </div>
      </div>

      {/* Main Workspace 
        - Mobile: flex-col, scrolls naturally as a page
        - Desktop: flex-row, sidebars scroll independently, canvas is fixed
      */}
      <div className="flex-1 flex flex-col md:flex-row relative md:h-[calc(100vh-64px)] overflow-y-auto md:overflow-hidden bg-gray-50">

        {/* ==================================================== */}
        {/* 1. CENTER PREVIEW (Mobile: Top, Desktop: Center) */}
        {/* ==================================================== */}
        <div className="order-1 md:order-2 w-full h-[55vh] md:h-full md:flex-1 bg-gray-100 flex items-center justify-center p-4 md:p-8 z-10 shrink-0 relative shadow-inner md:shadow-none">
             <div 
                className="shadow-[0_10px_40px_rgba(0,0,0,0.15)] bg-white rounded-md overflow-hidden transition-transform duration-300 hover:scale-[1.02]"
                style={{
                    height: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    aspectRatio: `${canvasConfig.width} / ${canvasConfig.height}`
                }}
             >
                <div style={{ width: '100%', height: '100%' }}>
                    <EditorCanvas readOnly={true} onStageRef={(ref) => (stageRef.current = ref)} />
                </div>
             </div>
        </div>

        {/* ==================================================== */}
        {/* 2. LEFT SIDEBAR (Mobile: Middle, Desktop: Left) */}
        {/* ==================================================== */}
        <div className="order-2 md:order-1 w-full md:w-80 bg-white shadow-xl z-20 flex flex-col md:h-full md:overflow-y-auto border-t md:border-r border-gray-200 shrink-0">
          <div className="p-6 flex flex-col gap-6">

            {/* Date Selection */}
            <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 shadow-sm transition hover:shadow-md hover:border-orange-200">
               <label className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2">
                 <FaCalendarAlt /> เลือกงวดวันที่
               </label>
               <input 
                 type="date"
                 value={selectedDate}
                 onChange={(e) => setSelectedDate(e.target.value)}
                 className="w-full p-2.5 bg-white border border-orange-200 rounded-xl text-gray-700 outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent cursor-pointer shadow-sm"
               />
            </div>

            {/* Seed Selection */}
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-sm transition hover:shadow-md hover:border-blue-200">
              <label className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                เลขตั้งต้น (Seed)
              </label>
              <input 
                type="text" 
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="เช่น รางวัลที่ 1..."
                className="w-full p-3 bg-white border border-blue-200 rounded-xl text-lg text-center font-mono tracking-widest focus:ring-2 focus:ring-blue-500 outline-none shadow-sm placeholder:text-gray-300"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-2">
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className={`w-full py-4 rounded-xl font-bold text-white text-lg shadow-[0_4px_15px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95 ${
                    isGenerating ? 'bg-gray-400 shadow-none cursor-not-allowed' : 'bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                  }`}
                >
                  {isGenerating ? (
                      <><div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div> กำลังคำนวณ...</>
                  ) : <><FaMagic /> คำนวณสูตรหวย</>}
                </button>

                <button 
                   onClick={handleDownload}
                   disabled={isDownloading}
                   className={`w-full py-3.5 border-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                     isDownloading 
                       ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                       : 'bg-white border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300 shadow-sm hover:shadow'
                   }`}
                >
                   <FaDownload /> {isDownloading ? 'กำลังบันทึก...' : 'บันทึกรูปภาพ'}
                </button>
            </div>

          </div>
        </div>

        {/* ==================================================== */}
        {/* 3. RIGHT SIDEBAR (Mobile: Bottom, Desktop: Right) */}
        {/* ==================================================== */}
        {(templateData?.template_backgrounds && templateData.template_backgrounds.length > 0) && (
            <div className="order-3 md:order-3 w-full md:w-72 bg-white shadow-xl z-20 flex flex-col md:h-full md:overflow-y-auto border-t md:border-l border-gray-200 shrink-0">
                <div className="p-6">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FaPalette className="text-purple-600" /> เลือกธีมพื้นหลัง
                    </h3>
                    
                    {/* Grid แสดงรูปภาพ ย่อให้เล็กลงหน่อยเพื่อความสวยงามในมือถือ */}
                    <div className="grid grid-cols-3 md:grid-cols-2 gap-3 pb-6">
                        
                        {/* Default */}
                        <div 
                            onClick={() => handleSelectBackground(templateData.background_url, 'default')}
                            className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all relative aspect-9/16 group shadow-sm ${
                                activeBgId === 'default' ? 'border-purple-500 ring-4 ring-purple-100 scale-[1.02]' : 'border-transparent hover:border-gray-300 hover:shadow-md'
                            }`}
                        >
                            <img src={templateData.background_url} className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent pt-6 pb-2 px-1 text-white text-[10px] text-center truncate font-medium">
                                มาตรฐาน
                            </div>
                            {activeBgId === 'default' && (
                                <div className="absolute top-2 right-2 bg-purple-500 text-white rounded-full p-1 shadow-md">
                                    <FaCheck size={8} />
                                </div>
                            )}
                        </div>

                        {/* Alternatives */}
                        {templateData.template_backgrounds.map((bg: any) => (
                            <div 
                                key={bg.id}
                                onClick={() => handleSelectBackground(bg.url, bg.id)}
                                className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all relative aspect-9/16 group shadow-sm ${
                                    activeBgId === bg.id ? 'border-purple-500 ring-4 ring-purple-100 scale-[1.02]' : 'border-transparent hover:border-gray-300 hover:shadow-md'
                                }`}
                            >
                                <img src={bg.url} className="w-full h-full object-cover" />
                                <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent pt-6 pb-2 px-1 text-white text-[10px] text-center truncate font-medium">
                                    {bg.name}
                                </div>
                                {activeBgId === bg.id && (
                                    <div className="absolute top-2 right-2 bg-purple-500 text-white rounded-full p-1 shadow-md">
                                        <FaCheck size={8} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Hidden Canvas สำหรับ Export */}
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