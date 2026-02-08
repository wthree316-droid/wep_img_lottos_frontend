import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCog, FaCheckSquare, FaSquare, FaDownload, FaCalendarAlt, FaMagic } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { LogoutButton } from '../components/LogoutButton';
import { useEditorStore, type EditorElement } from '../stores/useEditorStore';
import { EditorCanvas } from '../components/editor/EditorCanvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toBlob } from 'html-to-image';
import { preloadImage, waitForFonts } from '../utils/imageHelpers';
import { apiClient } from '../config/api';
import { BATCH_GENERATION_CONFIG, IMAGE_CAPTURE_CONFIG, DATA_KEYS } from '../config/constants';
import type { Lottery, Template, GeneratePayload, GenerateResponse, TemplateSlot } from '../types';

const formatDateThai = (dateStr: string) => {
  if (!dateStr) return "{วันที่}";
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit'
  });
};

export const DashboardPage = () => {
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, user } = useAuth();
  
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [commonDate, setCommonDate] = useState(new Date().toISOString().split('T')[0]);
  const [commonSeed, setCommonSeed] = useState('');
  const [isZipping, setIsZipping] = useState(false);
  const [progress, setProgress] = useState('');
  // 🔥 Key สำหรับสั่งล้างกระดาน (Remount)
  const [refreshKey, setRefreshKey] = useState(0);

  const { setElements, setCanvasSize, setBackgroundImage, canvasConfig } = useEditorStore();

  useEffect(() => {
    const loadLotteries = async () => {
      try {
        const data = await apiClient.get<Lottery[]>('/api/lotteries');
        setLotteries(data);
        setLoading(false);
      } catch (err: any) {
        console.error(err);
        alert('โหลดข้อมูลหวยไม่สำเร็จ: ' + (err.message || err));
        setLoading(false);
      }
    };

    loadLotteries();
  }, []);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === lotteries.length) setSelectedIds(new Set()); 
    else setSelectedIds(new Set(lotteries.map(l => l.id))); 
  };

  const handleBatchDownload = async () => {
    if (selectedIds.size === 0) return alert("กรุณาเลือกหวยอย่างน้อย 1 ใบ");
    
    setIsZipping(true);
    const zip = new JSZip();
    const folder = zip.folder(`Lotto-${commonDate}`);
    const templateCache: Record<string, Template> = {};
    const failedItems: string[] = [];

    try {
      const selectedLotteries = lotteries.filter(l => selectedIds.has(l.id));
      
      for (let i = 0; i < selectedLotteries.length; i++) {
        const lotto = selectedLotteries[i];
        setProgress(`กำลังสร้าง (${i + 1}/${selectedLotteries.length}): ${lotto.name}`);

        try {
          // 1. ♻️ สั่งล้างกระดานใหม่ทุกรอบ (Force Remount)
          setRefreshKey(prev => prev + 1);
          setElements([]);
          setBackgroundImage('');
          // พักนิดนึงให้ React เคลียร์ค่า
          await new Promise(r => setTimeout(r, BATCH_GENERATION_CONFIG.stateUpdateDelay));

          // 2. โหลดข้อมูล
          let templateId = lotto.template_id;
          
          // Override ด้วย User Template ถ้ามี
          if (user?.assigned_template_id) {
            templateId = user.assigned_template_id;
          }

          if (!templateId) {
             throw new Error("หวยนี้ไม่มีแม่พิมพ์ และคุณไม่ได้ตั้งค่าแม่พิมพ์ส่วนตัว");
          }

          let template: Template;
          if (templateCache[templateId]) {
            template = templateCache[templateId];
          } else {
            template = await apiClient.get<Template>(`/api/templates/${templateId}`);
            templateCache[templateId] = template;
          }

          const genPayload: GeneratePayload = {
            template_id: template.id,
            user_seed: commonSeed,
            slot_configs: template.template_slots!.map((s: TemplateSlot) => ({
              id: s.id,
              slot_type: s.data_key ? 'user_input' : 'system_label',
              data_key: s.data_key || undefined
            }))
          };
          
          const genData: GenerateResponse = await apiClient.post('/api/generate', genPayload);

          // 3. รอโหลดรูปพื้นหลังจริง
          if (template.background_url) {
            await preloadImage(template.background_url);
          }

          // 4. ตั้งค่า Store
          setCanvasSize(template.base_width, template.base_height);
          setBackgroundImage(template.background_url);
          
          const finalElements = template.template_slots!.map((slot: TemplateSlot) => {
            let text = slot.label_text;
            if (slot.data_key === DATA_KEYS.LOTTERY_NAME) text = lotto.name;
            else if (slot.data_key === DATA_KEYS.LOTTERY_DATE) text = formatDateThai(commonDate);
            else if (genData.results[slot.id]) text = genData.results[slot.id];

            return {
              id: slot.id,
              type: 'text' as const,
              label_text: text,
              dataKey: slot.data_key,
              pos_x: slot.pos_x, 
              pos_y: slot.pos_y,
              width: slot.width, 
              height: slot.height,
              style_config: slot.style_config
            };
          });

          setElements(finalElements as EditorElement[]);

          // 5. รอ Render (ปรับเวลาให้เหมาะสม)
          await waitForFonts();
          await new Promise(r => setTimeout(r, BATCH_GENERATION_CONFIG.renderDelay));

          // 6. 📸 จับภาพ
          const node = document.getElementById('batch-capture-canvas');
          if (node) {
            const blob = await toBlob(node, {
              ...IMAGE_CAPTURE_CONFIG,
              width: template.base_width,
              height: template.base_height,
              style: {
                transform: 'none',
              }
            });
            
            if (blob && folder) {
              folder.file(`${lotto.name}.png`, blob);
            } else {
              failedItems.push(lotto.name);
            }
          } else {
            failedItems.push(lotto.name);
          }
        } catch (error: any) {
          console.error(`Error processing ${lotto.name}:`, error);
          failedItems.push(`${lotto.name} (${error.message || 'Unknown error'})`);
        }
      }

      setProgress('กำลังบีบอัดไฟล์ ZIP...');
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `Lotto-Set-${commonDate}.zip`);

      if (failedItems.length > 0) {
        alert(`สร้างเสร็จแล้ว แต่มี ${failedItems.length} รายการที่ล้มเหลว:\n${failedItems.join('\n')}`);
      }

    } catch (error: any) {
      console.error(error);
      alert("เกิดข้อผิดพลาด: " + (error.message || error));
    } finally {
      setIsZipping(false);
      setProgress('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 relative">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">เลือกหวยที่ต้องการเล่น 🎰</h1>
            <p className="text-gray-500">
               ยินดีต้อนรับ, <span className="text-blue-600 font-bold">{user?.name || user?.username}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
                <Link to="/admin/dashboard" className="text-gray-500 hover:text-gray-700 flex items-center gap-2">
                <FaCog /> เมนูแอดมิน
                </Link>
            )}
            <div className="h-6 w-px bg-gray-300"></div>
            <LogoutButton />
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 mb-6">
            <button 
                onClick={() => setMode('single')}
                className={`flex-1 py-3 font-bold rounded-lg transition ${mode === 'single' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
                🎯 เลือกทีละใบ (Single)
            </button>
            <button 
                onClick={() => setMode('batch')}
                className={`flex-1 py-3 font-bold rounded-lg transition ${mode === 'batch' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
                📦 เหมาเข่ง หลายใบ (Batch)
            </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">กำลังโหลดเมนู... ⏳</div>
        ) : (
          <>
            {/* --- MODE 1: SINGLE --- */}
            {mode === 'single' && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {lotteries.map((lotto) => (
                    <Link 
                        key={lotto.id} 
                        to={`/play/${lotto.id}`}
                        className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-4 border border-transparent hover:border-blue-500 group flex flex-col items-center text-center cursor-pointer"
                    >
                        <div className="w-16 h-16 rounded-full bg-blue-50 mb-3 overflow-hidden border border-gray-100 group-hover:scale-110 transition">
                            {lotto.templates?.background_url ? (
                                <img src={lotto.templates.background_url} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">🎲</div>
                            )}
                        </div>
                        <h3 className="font-bold text-gray-800 group-hover:text-blue-600">{lotto.name}</h3>
                    </Link>
                    ))}
                </div>
            )}

            {/* --- MODE 2: BATCH --- */}
            {mode === 'batch' && (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar Control */}
                    <div className="w-full lg:w-80 bg-white p-6 rounded-xl shadow-sm h-fit sticky top-4">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-purple-700">
                            <FaCog /> ตั้งค่ารวม
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-1 block">วันที่บนภาพ</label>
                                <div className="flex items-center gap-2 border p-2 rounded bg-gray-50">
                                    <FaCalendarAlt className="text-gray-400" />
                                    <input 
                                        type="date" 
                                        value={commonDate} 
                                        onChange={e => setCommonDate(e.target.value)}
                                        className="bg-transparent outline-none w-full"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-sm font-bold text-gray-700 mb-1 block">เลขตั้งต้น (Seed)</label>
                                <div className="flex items-center gap-2 border p-2 rounded bg-gray-50">
                                    <FaMagic className="text-gray-400" />
                                    <input 
                                        type="text" 
                                        value={commonSeed} 
                                        onChange={e => setCommonSeed(e.target.value)}
                                        placeholder="สุ่มมั่วๆ ถ้าไม่ใส่"
                                        className="bg-transparent outline-none w-full"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <div className="flex justify-between text-sm mb-2">
                                    <span>เลือกแล้ว:</span>
                                    <span className="font-bold text-purple-600">{selectedIds.size} รายการ</span>
                                </div>
                                <button 
                                    onClick={handleBatchDownload}
                                    disabled={isZipping || selectedIds.size === 0}
                                    className={`w-full py-3 rounded-lg font-bold text-white shadow-lg flex items-center justify-center gap-2 transition ${
                                        isZipping 
                                        ? 'bg-gray-400 cursor-not-allowed' 
                                        : 'bg-linear-to-r from-purple-600 to-pink-600 hover:scale-105'
                                    }`}
                                >
                                    {isZipping ? 'กำลังทำงาน...' : <><FaDownload /> ดาวน์โหลด ZIP</>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Lottery Selection Grid */}
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-700">ติ๊กเลือกหวยที่ต้องการ</h3>
                            <button onClick={toggleAll} className="text-sm text-blue-600 hover:underline">
                                {selectedIds.size === lotteries.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {lotteries.map((lotto) => {
                                const isSelected = selectedIds.has(lotto.id);
                                return (
                                    <div 
                                        key={lotto.id}
                                        onClick={() => toggleSelection(lotto.id)}
                                        className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-center gap-3 ${
                                            isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-100 bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        <div className={`text-xl ${isSelected ? 'text-purple-600' : 'text-gray-300'}`}>
                                            {isSelected ? <FaCheckSquare /> : <FaSquare />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-800 truncate">{lotto.name}</h4>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
          </>
        )}

      </div>

      {isZipping && (
        <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center">
            
            {/* 🌑 ฉากหลังทึบ */}
            <div className="absolute inset-0 bg-black/95 z-40"></div>

            {/* 🕵️‍♂️ CANVAS ลับ (ตัวจับภาพ)
                ✅ แก้ไข: วางไว้ที่ 0,0 ของหน้าจอเลย (ซ่อนไว้หลังฉากดำ)
                ห้ามใช้ translate(-50%, -50%) เพราะจะทำให้ library คำนวณพิกัดเพี้ยน
            */}
            <div 
                id="batch-capture-canvas"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: canvasConfig.width,
                    height: canvasConfig.height,
                    zIndex: 10, // อยู่หลังฉากดำ (40)
                    pointerEvents: 'none',
                    // opacity: 0 // ❌ ห้ามใช้ opacity เดี๋ยวภาพขาว
                }}
            >
                <EditorCanvas key={refreshKey} readOnly={true} />
            </div>

            {/* 📺 UI แสดงผล (Preview ย่อส่วน) */}
            <div className="relative z-50 text-white text-center flex flex-col items-center">
                <div className="text-2xl font-bold mb-4 animate-pulse">กำลังสร้างภาพคุณภาพสูง...</div>
                <div className="text-lg text-gray-300 mb-6">{progress}</div>
                
                <div 
                    className="relative shadow-2xl border-4 border-gray-700 rounded-lg overflow-hidden bg-white"
                    style={{
                        width: '300px',
                        height: `${(canvasConfig.height / canvasConfig.width) * 300}px`
                    }}
                >
                    <div style={{
                        transform: `scale(${300 / canvasConfig.width})`, 
                        transformOrigin: 'top left',
                        width: canvasConfig.width,
                        height: canvasConfig.height
                    }}>
                        <EditorCanvas key={`preview-${refreshKey}`} readOnly={true} />
                    </div>
                </div>

                <p className="text-sm text-gray-500 mt-8">* กรุณาอย่าปิดหน้าต่างนี้จนกว่าจะเสร็จ</p>
            </div>
        </div>
      )}
    </div>
  );
};