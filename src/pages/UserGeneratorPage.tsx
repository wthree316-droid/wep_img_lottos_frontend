import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { EditorCanvas } from '../components/editor/EditorCanvas';
import { useEditorStore } from '../stores/useEditorStore';
import { FaArrowLeft, FaMagic, FaDownload, FaCalendarAlt, FaPalette, FaUserCircle } from 'react-icons/fa';
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

  // ✅ Ref สำหรับจับ Stage ของ Konva เพื่อ Export รูป
  const stageRef = useRef<any>(null);

  useEffect(() => {
    if (!id || !user) return;
    
    const loadData = async () => {
      try {
        const data = await apiClient.get(`/api/lotteries/${id}`);
        const lottery = data.lottery;
        let template = data.template;

        // 1. ดึง User ล่าสุด เพื่อให้แน่ใจว่าได้แม่พิมพ์ตัวล่าสุดที่เลือกไว้
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
             // fallback to context user
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

        // ✅ 2. ดึง Config ของ "เจ้าของแม่พิมพ์" (Template Owner)
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
        
        // 3. Map Elements พร้อมแทนค่าทันที
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

          const scaledFontSize = calculateScaledFontSize(
            slot.style_config.fontSize
          );

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
            // ✅ แก้ไขตรงนี้: ยกเว้น ชื่อหวย และ วันที่ ไม่ให้เป็น user_input
            else if (el.dataKey === DATA_KEYS.LOTTERY_NAME || el.dataKey === DATA_KEYS.LOTTERY_DATE) {
                slotType = 'system_label'; // ส่งเป็น system_label เพื่อให้ Backend ข้ามไป ไม่ต้องสุ่ม
            }
            else if (el.dataKey) {
                slotType = 'user_input'; // อันอื่นที่เหลือค่อยสุ่ม (เช่น เลข 3 ตัว, 2 ตัว)
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

  // ✅ ฟังก์ชัน Download ใหม่ ใช้ Konva API (ชัดกว่า เร็วกว่า)
  const handleDownload = async () => {
    if (!stageRef.current) return;
    
    setIsDownloading(true);
    try {
      await waitForFonts();
      await new Promise(r => setTimeout(r, 500)); 

      // 🚀 Export ความละเอียดสูง (Pixel Ratio 2 = Retina)
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

  if (loading) return <div className="text-center p-20">กำลังโหลดแม่พิมพ์...</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm flex items-center justify-between px-8 z-30 relative">
        <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-blue-600">
          <FaArrowLeft /> กลับหน้าหลัก
        </Link>
        <h1 className="font-bold text-xl hidden md:block">เครื่องคำนวณหวย 🎰</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
             <FaUserCircle /> 
             <span className="hidden sm:inline">เล่นโดย:</span> 
             <span className="font-bold text-blue-600">{user?.name}</span>
        </div> 
      </div>

      <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden relative">
        
        {/* LEFT SIDEBAR */}
        <div className="w-full md:w-80 bg-white p-6 shadow-lg z-20 flex flex-col gap-6 overflow-y-auto relative border-r border-gray-200">
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

        {/* CENTER PREVIEW */}
        <div className="flex-1 bg-gray-200 relative overflow-hidden flex items-center justify-center p-4 z-0">
             <div 
                className="shadow-2xl bg-white"
                style={{
                    height: '100%',
                    maxHeight: '90vh',
                    width: 'auto',
                    aspectRatio: `${canvasConfig.width} / ${canvasConfig.height}`
                }}
             >
                <div style={{ width: '100%', height: '100%' }}>
                    {/* ✅ ส่ง onStageRef ไปจับ Stage ของ Konva */}
                    <EditorCanvas readOnly={true} onStageRef={(ref) => (stageRef.current = ref)} />
                </div>
             </div>
        </div>

        {/* RIGHT SIDEBAR (Styles) */}
        {(templateData?.template_backgrounds && templateData.template_backgrounds.length > 0) && (
            <div className="w-full md:w-72 bg-white p-4 shadow-lg z-20 overflow-y-auto border-l border-gray-200">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2 sticky top-0 bg-white py-2 z-10">
                    <FaPalette className="text-purple-600" /> เลือกธีมพื้นหลัง
                </h3>
                <div className="grid grid-cols-2 gap-3 pb-4">
                    {/* Default */}
                    <div 
                        onClick={() => handleSelectBackground(templateData.background_url, 'default')}
                        className={`cursor-pointer rounded-lg overflow-hidden border-2 transition relative aspect-9/16 group ${
                            activeBgId === 'default' ? 'border-purple-600 ring-2 ring-purple-100' : 'border-gray-100 hover:border-gray-300'
                        }`}
                    >
                        <img src={templateData.background_url} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] p-1.5 text-center truncate backdrop-blur-sm">
                            มาตรฐาน
                        </div>
                    </div>

                    {/* Alternatives */}
                    {templateData.template_backgrounds.map((bg: any) => (
                        <div 
                            key={bg.id}
                            onClick={() => handleSelectBackground(bg.url, bg.id)}
                            className={`cursor-pointer rounded-lg overflow-hidden border-2 transition relative aspect-9/16 group ${
                                activeBgId === bg.id ? 'border-purple-600 ring-2 ring-purple-100' : 'border-gray-100 hover:border-gray-300'
                            }`}
                        >
                            <img src={bg.url} className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] p-1.5 text-center truncate backdrop-blur-sm">
                                {bg.name}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};