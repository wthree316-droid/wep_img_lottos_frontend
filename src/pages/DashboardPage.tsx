import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCog, FaCheckSquare, FaSquare, FaDownload, FaCalendarAlt, FaMagic, FaSearch, FaClock, FaPalette, FaCheck } from 'react-icons/fa';
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
import type { Lottery, Template, GeneratePayload, GenerateResponse, TemplateSlot, User } from '../types';

const formatDateThai = (dateStr: string) => {
  if (!dateStr) return "{วันที่}";
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit'
  });
};

const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
    const [timeLeft, setTimeLeft] = useState("");
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +new Date(targetDate) - +new Date();
            if (difference > 0) {
                const hours = Math.floor((difference / (1000 * 60 * 60))); 
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);
                
                const h = hours.toString().padStart(2, '0');
                const m = minutes.toString().padStart(2, '0');
                const s = seconds.toString().padStart(2, '0');
                
                setTimeLeft(`${h}:${m}:${s}`);
                setIsExpired(false);
            } else {
                setTimeLeft("ปิดรับแล้ว");
                setIsExpired(true);
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [targetDate]);

    return (
        <span className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${
            isExpired ? 'bg-gray-200 text-gray-500' : 'bg-red-50 text-red-600 animate-pulse'
        }`}>
            <FaClock /> {timeLeft}
        </span>
    );
};

export const DashboardPage = () => {
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [filteredLotteries, setFilteredLotteries] = useState<Lottery[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, user } = useAuth();
  
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [commonDate, setCommonDate] = useState(new Date().toISOString().split('T')[0]);
  const [commonSeed, setCommonSeed] = useState('');
  const [isZipping, setIsZipping] = useState(false);
  const [progress, setProgress] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [searchTerm, setSearchTerm] = useState('');

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [myTemplates, setMyTemplates] = useState<Template[]>([]);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);

  const { setElements, setCanvasSize, setBackgroundImage, canvasConfig } = useEditorStore();

  useEffect(() => {
    const loadLotteries = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get<Lottery[]>('/api/lotteries');
        
        // 1. Prepare User Template (Override Level 1)
        let userTemplate: Template | null = null;
        if (user?.assigned_template_id) {
            try {
                userTemplate = await apiClient.get<Template>(`/api/templates/${user.assigned_template_id}`);
            } catch (e) {
                console.error("Failed to load user template");
            }
        }

        // 2. Prepare System Default Template (Override Level 3 - Fallback)
        let systemTemplate: Template | null = null;
        if (!userTemplate) {
            try {
                const res = await apiClient.get<Template[]>('/api/templates');
                // Backend sorts by created_at desc, so index 0 is latest active
                const activeTemplates = res.filter(t => t.is_active);
                if (activeTemplates.length > 0) {
                    systemTemplate = activeTemplates[0];
                }
            } catch (e) { }
        }

        // 3. Map Lotteries with Effective Template
        const updatedLotteries = data.map(lotto => {
            // Priority 1: User Assigned Template (Overrides everything)
            if (userTemplate) {
                return {
                    ...lotto,
                    template_id: userTemplate.id,
                    templates: {
                        background_url: userTemplate.background_url,
                        base_width: userTemplate.base_width,
                        base_height: userTemplate.base_height
                    }
                };
            }
            
            // Priority 2: Lottery Specific Template (Already in lotto data)
            if (lotto.templates?.background_url) {
                return lotto;
            }

            // Priority 3: System Default (If lottery has no template)
            if (systemTemplate) {
                 return {
                    ...lotto,
                    template_id: systemTemplate.id,
                    templates: {
                        background_url: systemTemplate.background_url,
                        base_width: systemTemplate.base_width,
                        base_height: systemTemplate.base_height
                    }
                };
            }

            // Fallback: No template image (Dice icon)
            return lotto;
        });

        setLotteries(updatedLotteries);
        setFilteredLotteries(updatedLotteries);
        setLoading(false);
      } catch (err: any) {
        console.error(err);
        alert('โหลดข้อมูลหวยไม่สำเร็จ: ' + (err.message || err));
        setLoading(false);
      }
    };

    if (user) {
        loadLotteries();
        if (user.assigned_template_id) {
            setCurrentTemplateId(user.assigned_template_id);
        }
    }
  }, [user]);

  useEffect(() => {
    if (!searchTerm) {
        setFilteredLotteries(lotteries);
        return;
    }
    const lower = searchTerm.toLowerCase();
    const filtered = lotteries.filter(l => l.name.toLowerCase().includes(lower));
    setFilteredLotteries(filtered);
  }, [searchTerm, lotteries]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredLotteries.length) setSelectedIds(new Set()); 
    else setSelectedIds(new Set(filteredLotteries.map(l => l.id))); 
  };

  const handleOpenTemplateModal = async () => {
      if (!user) return;

      try {
          // ✅ Force Fetch User to ensure allowed_template_ids is fresh
          const currentUser = await apiClient.get<User>(`/api/users/${user.id}`);
          
          if (currentUser.allowed_template_ids && currentUser.allowed_template_ids.length > 0) {
              const allTemplates = await apiClient.get<Template[]>('/api/templates');
              const allowedIds = currentUser.allowed_template_ids;
              const allowedTemplates = allTemplates.filter(t => allowedIds.includes(t.id));
              setMyTemplates(allowedTemplates);
              setIsTemplateModalOpen(true);
          } else {
              alert("คุณยังไม่ได้ถูกกำหนดแม่พิมพ์ทางเลือก (โปรดติดต่อแอดมิน)");
          }
      } catch (e) {
          console.error(e);
          alert("ไม่สามารถโหลดข้อมูลผู้ใช้งานได้");
      }
  };

  const handleSelectTemplate = async (templateId: string) => {
      try {
          if (!user) return;
          await apiClient.put(`/api/users/${user.id}`, { assigned_template_id: templateId });
          
          const updatedUser = await apiClient.get<User>(`/api/users/${user.id}`);
          localStorage.setItem('lotto_user', JSON.stringify(updatedUser));

          setCurrentTemplateId(templateId);
          alert("✅ เปลี่ยนธีมสำเร็จ! ระบบจะรีโหลดเพื่อแสดงผล...");
          setIsTemplateModalOpen(false);
          
          window.location.reload(); 
      } catch (e) {
          console.error(e);
          alert("เปลี่ยนธีมไม่สำเร็จ");
      }
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
          setRefreshKey(prev => prev + 1);
          setElements([]);
          setBackgroundImage('');
          await new Promise(r => setTimeout(r, BATCH_GENERATION_CONFIG.stateUpdateDelay));

          // ✅ Use logic similar to useEffect for consistency
          let templateId = lotto.template_id; 
          
          // Note: lotteries state is already updated with user's template preference in useEffect
          // so lotto.template_id should be correct here if selected from UI.
          // But to be safe, we re-check priority (redundant but safe)
          if (user?.assigned_template_id) {
            templateId = user.assigned_template_id;
          }

          if (!templateId) {
             // Try to find system default if still null
             try {
                 const res = await apiClient.get<Template[]>('/api/templates');
                 const active = res.filter(t => t.is_active);
                 if (active.length > 0) templateId = active[0].id;
             } catch(e) {}
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
            slot_configs: template.template_slots!.map((s: TemplateSlot) => {
                let slotType = 'system_label';
                // ✅ Robust type checking for batch mode too
                if (s.slot_type === 'qr_code' || s.data_key === DATA_KEYS.QR_CODE) slotType = 'qr_code';
                else if (s.slot_type === 'static_text' || s.data_key === DATA_KEYS.LINE_ID) slotType = 'static_text';
                else if (s.data_key) slotType = 'user_input';
                
                return {
                    id: s.id,
                    slot_type: slotType as any,
                    data_key: s.data_key || undefined
                };
            })
          };
          
          const genData: GenerateResponse = await apiClient.post('/api/generate', genPayload);

          if (template.background_url) {
            await preloadImage(template.background_url);
          }

          setCanvasSize(template.base_width, template.base_height);
          setBackgroundImage(template.background_url);
          
          const finalElements = template.template_slots!.map((slot: TemplateSlot) => {
            let text = slot.label_text;
            if (slot.data_key === DATA_KEYS.LOTTERY_NAME) text = lotto.name;
            else if (slot.data_key === DATA_KEYS.LOTTERY_DATE) text = formatDateThai(commonDate);
            else if (genData.results[slot.id]) text = genData.results[slot.id];

            return {
              id: slot.id,
              type: slot.slot_type === 'qr_code' ? 'qr_code' : (slot.slot_type === 'static_text' ? 'static_text' : 'text'), 
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

          await waitForFonts();
          await new Promise(r => setTimeout(r, BATCH_GENERATION_CONFIG.renderDelay));

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
            {/* ✅ ปุ่มเปลี่ยนธีมสำหรับ Member */}
            <button 
                onClick={handleOpenTemplateModal}
                className="flex items-center gap-2 bg-purple-50 text-purple-600 px-4 py-2 rounded-lg font-bold hover:bg-purple-100 transition"
            >
                <FaPalette /> เปลี่ยนธีมแม่พิมพ์
            </button>

            {isAdmin && (
                <Link to="/admin/dashboard" className="text-gray-500 hover:text-gray-700 flex items-center gap-2 border-l pl-4 border-gray-300">
                <FaCog /> เมนูแอดมิน
                </Link>
            )}
            <div className="h-6 w-px bg-gray-300"></div>
            <LogoutButton />
          </div>
        </div>

        {/* Tab & Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex gap-2 flex-1">
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
            
            <div className="relative w-full md:w-80">
                <span className="absolute left-3 top-3.5 text-gray-400"><FaSearch /></span>
                <input 
                    type="text" 
                    placeholder="ค้นหาชื่อหวย..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 p-3 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">กำลังโหลดเมนู... ⏳</div>
        ) : (
          <>
            {/* --- MODE 1: SINGLE --- */}
            {mode === 'single' && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredLotteries.map((lotto) => (
                    <Link 
                        key={lotto.id} 
                        to={`/play/${lotto.id}`}
                        className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-4 border border-transparent hover:border-blue-500 group flex flex-col items-center text-center cursor-pointer"
                    >
                        <div className="w-16 h-16 rounded-full bg-blue-50 mb-3 overflow-hidden border border-gray-100 group-hover:scale-110 transition relative">
                            {lotto.templates?.background_url ? (
                                <img src={lotto.templates.background_url} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">🎲</div>
                            )}
                        </div>
                        <h3 className="font-bold text-gray-800 group-hover:text-blue-600">{lotto.name}</h3>
                        
                        {/* ✅ 3. Countdown Timer */}
                        {lotto.closing_time && (
                            <div className="mt-1">
                                <CountdownTimer targetDate={lotto.closing_time} />
                            </div>
                        )}
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
                                {selectedIds.size === filteredLotteries.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {filteredLotteries.map((lotto) => {
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

            {/* 🕵️‍♂️ CANVAS ลับ (ตัวจับภาพ) */}
            <div 
                id="batch-capture-canvas"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: canvasConfig.width,
                    height: canvasConfig.height,
                    zIndex: 10,
                    pointerEvents: 'none',
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

      {/* --- TEMPLATE SELECTION MODAL --- */}
      {isTemplateModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 max-h-[80vh] flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                          <FaPalette /> เลือกธีมแม่พิมพ์ของคุณ
                      </h3>
                      <button onClick={() => setIsTemplateModalOpen(false)} className="text-gray-400 hover:text-gray-600">ปิด</button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-2">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {myTemplates.map(t => (
                              <div 
                                  key={t.id}
                                  onClick={() => handleSelectTemplate(t.id)}
                                  className={`border-2 rounded-xl overflow-hidden cursor-pointer transition hover:shadow-md relative group ${
                                      currentTemplateId === t.id ? 'border-purple-600 ring-2 ring-purple-100' : 'border-gray-100'
                                  }`}
                              >
                                  <div className="aspect-[9/16] bg-gray-100 relative">
                                      {t.background_url ? (
                                          <img src={t.background_url} className="w-full h-full object-cover" />
                                      ) : (
                                          <div className="flex items-center justify-center h-full text-gray-300">NO IMAGE</div>
                                      )}
                                      
                                      {currentTemplateId === t.id && (
                                          <div className="absolute inset-0 bg-purple-600/20 flex items-center justify-center">
                                              <div className="bg-white rounded-full p-2 text-purple-600 shadow-lg">
                                                  <FaCheck />
                                              </div>
                                          </div>
                                      )}
                                  </div>
                                  <div className="p-3 bg-white">
                                      <h4 className="font-bold text-sm text-gray-800 truncate">{t.name}</h4>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};