import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    FaCog, FaCheckSquare, FaSquare, FaDownload, FaCalendarAlt, 
    FaMagic, FaSearch, FaClock, FaPalette, FaCheck, FaBookmark, FaTimes, FaLayerGroup 
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { LogoutButton } from '../components/LogoutButton';
import Konva from 'konva';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { waitForFonts } from '../utils/imageHelpers';
import { apiClient } from '../config/api';
import { DATA_KEYS } from '../config/constants';
import type { Lottery, Template, GeneratePayload, GenerateResponse, TemplateSlot, User } from '../types';

const formatDateThai = (dateStr: string) => {
  if (!dateStr) return "{วันที่}";
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit'
  });
};

// ✅ ฟังก์ชันช่วยโหลดรูปภาพเข้า Memory โดยตรง
const loadNativeImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`โหลดรูปไม่สำเร็จ: ${url}`));
        img.src = url;
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
        <span className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full font-bold shadow-sm ${
            isExpired ? 'bg-gray-100 text-gray-500' : 'bg-red-50 text-red-600 animate-pulse border border-red-100'
        }`}>
            <FaClock /> {timeLeft}
        </span>
    );
};

// 🌟 Type สำหรับเก็บกลุ่มหวย
type SavedGroup = {
    id: string;
    name: string;
    lottoIds: string[];
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
  
  const [searchTerm, setSearchTerm] = useState('');

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [myTemplates, setMyTemplates] = useState<Template[]>([]);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);

  const [savedGroups, setSavedGroups] = useState<SavedGroup[]>([]);

  // โหลดข้อมูลหวยและธีม
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const lottoData = await apiClient.get<Lottery[]>('/api/lotteries');
        let myPersonalTemplate: Template | null = null;
        
        if (user) {
            const storedGroups = localStorage.getItem(`lotto_groups_${user.id}`);
            if (storedGroups) setSavedGroups(JSON.parse(storedGroups));

            try {
                const myTemplates = await apiClient.get<Template[]>(`/api/templates?owner_id=${user.id}`);
                const freshUser = await apiClient.get<User>(`/api/users/${user.id}`);
                
                if (freshUser.assigned_template_id) {
                     try {
                        myPersonalTemplate = await apiClient.get<Template>(`/api/templates/${freshUser.assigned_template_id}`);
                     } catch(e) { 
                        if (myTemplates.length > 0) myPersonalTemplate = myTemplates[0];
                     }
                } else {
                     if (myTemplates.length > 0) myPersonalTemplate = myTemplates[0];
                }
                
                if (myPersonalTemplate) {
                    setCurrentTemplateId(myPersonalTemplate.id);
                }
            } catch (e) {
                console.warn("Could not load user personal template", e);
            }
        }

        const updatedLotteries = lottoData.map(lotto => {
            if (myPersonalTemplate) {
                return { ...lotto, template_id: myPersonalTemplate.id, templates: { background_url: myPersonalTemplate.background_url, base_width: myPersonalTemplate.base_width, base_height: myPersonalTemplate.base_height } };
            }
            return lotto;
        });

        setLotteries(updatedLotteries);
        setFilteredLotteries(updatedLotteries);
        setLoading(false);
      } catch (err: any) {
        console.error(err);
        alert('โหลดข้อมูลหวยไม่สำเร็จ (โปรดรีเฟรช): ' + (err.message || err));
        setLoading(false);
      }
    };

    if (user) loadData();
  }, [user]);

  useEffect(() => {
    if (!searchTerm) { setFilteredLotteries(lotteries); return; }
    const lower = searchTerm.toLowerCase();
    setFilteredLotteries(lotteries.filter(l => l.name.toLowerCase().includes(lower)));
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

  const handleSaveGroup = () => {
      if (selectedIds.size === 0) return alert("กรุณาติ๊กเลือกหวยอย่างน้อย 1 ใบก่อนบันทึกกลุ่ม");
      const name = prompt("ตั้งชื่อกลุ่มหวยนี้ (เช่น ชุดเช้า, ชุดฮานอย, รูปแบบที่ 1):");
      if (!name || name.trim() === "") return;

      const newGroup: SavedGroup = {
          id: Date.now().toString(),
          name: name.trim(),
          lottoIds: Array.from(selectedIds)
      };

      const updatedGroups = [...savedGroups, newGroup];
      setSavedGroups(updatedGroups);
      if (user) localStorage.setItem(`lotto_groups_${user.id}`, JSON.stringify(updatedGroups));
      alert(`✅ บันทึกกลุ่ม "${name}" เรียบร้อยแล้ว`);
  };

  const handleApplyGroup = (group: SavedGroup) => {
      setSelectedIds(new Set(group.lottoIds));
  };

  const handleDeleteGroup = (e: React.MouseEvent, groupId: string) => {
      e.stopPropagation(); 
      if (!confirm("ต้องการลบกลุ่มนี้ใช่หรือไม่?")) return;
      const updatedGroups = savedGroups.filter(g => g.id !== groupId);
      setSavedGroups(updatedGroups);
      if (user) localStorage.setItem(`lotto_groups_${user.id}`, JSON.stringify(updatedGroups));
  };

  const handleOpenTemplateModal = async () => { 
      if (!user) return;
      try {
          const currentUser = await apiClient.get<User>(`/api/users/${user.id}`);
          const allTemplates = await apiClient.get<Template[]>('/api/templates');
          const allowedIds = currentUser.allowed_template_ids || [];
          const myAvailableTemplates = allTemplates.filter(t => allowedIds.includes(t.id) || t.owner_id === user.id);

          if (myAvailableTemplates.length > 0) {
              setMyTemplates(myAvailableTemplates);
              if (currentUser.assigned_template_id) setCurrentTemplateId(currentUser.assigned_template_id);
              else if (myAvailableTemplates.length > 0 && myAvailableTemplates[0].owner_id === user.id) setCurrentTemplateId(myAvailableTemplates[0].id);
              setIsTemplateModalOpen(true);
          } else { alert("คุณยังไม่มีธีมให้เลือก (โปรดสร้างแม่พิมพ์ใหม่ หรือติดต่อแอดมิน)"); }
      } catch (e) { console.error(e); alert("โหลดข้อมูลไม่สำเร็จ"); }
  };

  const handleSelectTemplate = async (templateId: string) => { 
      try {
          if (!user) return;
          await apiClient.put(`/api/users/${user.id}`, { assigned_template_id: templateId });
          setCurrentTemplateId(templateId);
          alert("✅ เปลี่ยนธีมสำเร็จ! กำลังรีโหลด...");
          window.location.reload(); 
      } catch (e) { console.error(e); alert("เปลี่ยนธีมไม่สำเร็จ"); }
  };

  // 🚀 ฟังก์ชันโหลดเหมาเข่งแบบ Turbo
  const handleBatchDownload = async () => {
    if (selectedIds.size === 0) return alert("กรุณาเลือกหวยอย่างน้อย 1 ใบ");
    setIsZipping(true);
    const zip = new JSZip();
    const folder = zip.folder(`Lotto-${commonDate}`);
    const failedItems: string[] = [];

    try {
        await waitForFonts(); 

        const selectedLotteries = lotteries.filter(l => selectedIds.has(l.id));
        setProgress(`กำลังโหลดแม่พิมพ์ที่ต้องใช้...`);

        const bgCache: Record<string, HTMLImageElement> = {};
        const templateCache: Record<string, Template> = {};

        // ✅ 1. โหลด Template และรูปภาพ "ทั้งหมด" ที่จำเป็นต้องใช้ เตรียมไว้ก่อนเลย
        // (เทคนิคป้องกัน Race Condition ไม่ให้ยิง API ขอแม่พิมพ์เดิมซ้ำซ้อน)
        const uniqueTemplateIds = [...new Set(selectedLotteries.map(l => l.template_id).filter(id => id))];
        
        for (const tId of uniqueTemplateIds) {
            if (tId && !templateCache[tId]) {
                templateCache[tId] = await apiClient.get<Template>(`/api/templates/${tId}`);
                const bgUrl = templateCache[tId].background_url;
                if (bgUrl && !bgCache[bgUrl]) {
                    bgCache[bgUrl] = await loadNativeImage(bgUrl);
                }
            }
        }

        setProgress(`กำลังคำนวณสูตรหวย (0/${selectedLotteries.length})...`);

        // ✅ 2. Parallel API: ยิง API คำนวณเลขหวย "พร้อมกันทุกใบ" (ตอนนี้จะไม่ชนกันแล้ว)
        const generatePromises = selectedLotteries.map(async (lotto) => {
            let templateId = lotto.template_id; 
            if (!templateId) throw new Error("หวยนี้ไม่มีแม่พิมพ์");

            // ดึงจาก Cache ที่เตรียมไว้แล้ว 100%
            const template = templateCache[templateId];

            const genPayload: GeneratePayload = {
                template_id: template.id, user_seed: commonSeed, target_user_id: user?.id, 
                slot_configs: template.template_slots!.map((s: TemplateSlot) => {
                    let slotType = 'system_label';
                    if (s.slot_type === 'qr_code' || s.data_key === DATA_KEYS.QR_CODE) slotType = 'qr_code';
                    else if (s.slot_type === 'static_text' || s.data_key === DATA_KEYS.LINE_ID) slotType = 'static_text';
                    else if (s.data_key === DATA_KEYS.LOTTERY_NAME || s.data_key === DATA_KEYS.LOTTERY_DATE) slotType = 'system_label';
                    else if (s.data_key) slotType = 'user_input';
                    return { id: s.id, slot_type: slotType as any, data_key: s.data_key || undefined };
                })
            };
            
            const genData: GenerateResponse = await apiClient.post('/api/generate', genPayload);
            return { lotto, template, genData };
        });

        // รอผลลัพธ์คำนวณทั้งหมด
        const generatedResults = await Promise.allSettled(generatePromises);

        for (let i = 0; i < generatedResults.length; i++) {
            const result = generatedResults[i];
            if (result.status === 'rejected') {
                failedItems.push(`ใบที่ ${i+1} ล้มเหลว: ${result.reason}`);
                continue;
            }

            const { lotto, template, genData } = result.value;
            setProgress(`กำลังวาดภาพ (${i + 1}/${selectedLotteries.length}): ${lotto.name}`);

            try {
                const stage = new Konva.Stage({
                    container: document.createElement('div'),
                    width: template.base_width,
                    height: template.base_height,
                });
                const layer = new Konva.Layer();
                stage.add(layer);

                layer.add(new Konva.Rect({ width: template.base_width, height: template.base_height, fill: 'white' }));
                if (template.background_url && bgCache[template.background_url]) {
                    layer.add(new Konva.Image({
                        image: bgCache[template.background_url],
                        width: template.base_width, height: template.base_height,
                    }));
                }

                for (const slot of template.template_slots!) {
                    let text = slot.label_text;
                    if (slot.data_key === DATA_KEYS.LOTTERY_NAME) text = lotto.name;
                    else if (slot.data_key === DATA_KEYS.LOTTERY_DATE) text = formatDateThai(commonDate);
                    else if (genData.results[slot.id]) text = genData.results[slot.id];

                    const x = (slot.pos_x * template.base_width) / 100;
                    const y = (slot.pos_y * template.base_height) / 100;
                    const w = (slot.width * template.base_width) / 100;
                    const h = (slot.height * template.base_height) / 100;

                    if (slot.slot_type === 'qr_code' || slot.data_key === DATA_KEYS.QR_CODE) {
                        try {
                            const qrImg = await loadNativeImage(text || "https://placehold.co/200x200/png?text=QR");
                            layer.add(new Konva.Image({ image: qrImg, x, y, width: w, height: h }));
                        } catch(e) { /* ละเว้นถ้า QR error */ }
                    } else {
                        const currentColors = slot.style_config.gradientColors || [slot.style_config.color];
                        const isGradient = currentColors.length > 1;
                        let colorStops: (number|string)[] = [];
                        if (isGradient) {
                            currentColors.forEach((c: string, idx: number) => { colorStops.push(idx / (currentColors.length - 1), c); });
                        }

                        let shadowBlur = 0, shadowColor = 'transparent', shadowOffsetX = 0, shadowOffsetY = 0;
                        if (slot.style_config.textShadow) {
                            const parts = slot.style_config.textShadow.split(' ');
                            if (parts.length >= 4) {
                                shadowOffsetX = parseInt(parts[0]); shadowOffsetY = parseInt(parts[1]);
                                shadowBlur = parseInt(parts[2]); shadowColor = parts[3];
                            }
                        }

                        layer.add(new Konva.Text({
                            text: text, x, y, width: w, height: h,
                            fontSize: slot.style_config.fontSize,
                            fontFamily: slot.style_config.fontFamily,
                            fill: isGradient ? undefined : currentColors[0],
                            fillPriority: isGradient ? 'linear-gradient' : 'color',
                            fillLinearGradientStartPoint: { x: 0, y: 0 },
                            fillLinearGradientEndPoint: { x: 0, y: h },
                            fillLinearGradientColorStops: colorStops,
                            align: slot.style_config.textAlign,
                            fontStyle: slot.style_config.fontWeight,
                            stroke: slot.style_config.stroke,
                            strokeWidth: slot.style_config.stroke ? (slot.style_config.strokeWidth || 1) : 0,
                            shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY,
                            verticalAlign: 'middle', padding: 10, lineHeight: 1.4
                        }));
                    }
                }

                const blob = await new Promise<Blob | null>(resolve => {
                    stage.toBlob({ pixelRatio: 2, mimeType: 'image/jpeg', quality: 0.9, callback: resolve });
                });

                if (blob && folder) folder.file(`${lotto.name}.jpg`, blob);
                else failedItems.push(lotto.name);

                stage.destroy(); 

            } catch (drawError: any) {
                console.error(`Draw Error ${lotto.name}:`, drawError);
                failedItems.push(`${lotto.name} (Draw Error)`);
            }
        }

        setProgress('กำลังบีบอัดไฟล์ ZIP...');
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `Lotto-Set-${commonDate}.zip`);

        if (failedItems.length > 0) alert(`สร้างเสร็จแล้ว แต่มีล้มเหลว ${failedItems.length} รายการ:\n${failedItems.join('\n')}`);

    } catch (error: any) { 
        alert("เกิดข้อผิดพลาด: " + (error.message || error)); 
    } 
    finally { setIsZipping(false); setProgress(''); }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans pb-20">
      
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
                 เครื่องมือสร้างหวย <span className="text-2xl">🎰</span>
              </h1>
              <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                 ยินดีต้อนรับ, <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">{user?.name || user?.username}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-3 overflow-x-auto pb-1 hide-scrollbar">
              <button 
                  onClick={handleOpenTemplateModal}
                  className="flex items-center gap-2 bg-linear-to-r from-purple-50 to-pink-50 border border-purple-100 text-purple-700 px-4 py-2 rounded-xl font-bold hover:shadow-md transition text-sm whitespace-nowrap"
              >
                  <FaPalette /> ธีมแม่พิมพ์
              </button>
              {isAdmin && (
                  <Link to="/admin/dashboard" className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-bold hover:bg-gray-200 transition text-sm whitespace-nowrap">
                    <FaCog /> แอดมิน
                  </Link>
              )}
              <div className="h-8 w-px bg-gray-300 hidden md:block"></div>
              <LogoutButton />
            </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        
        <div className="flex flex-col lg:flex-row gap-4 mb-8 bg-white p-2 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100">
            <div className="flex bg-gray-100 p-1.5 rounded-xl flex-1 lg:max-w-md relative">
                <button 
                    onClick={() => setMode('single')}
                    className={`flex-1 py-2.5 font-bold rounded-lg transition-all text-sm flex items-center justify-center gap-2 z-10 ${mode === 'single' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    🎯 เลือกทีละใบ
                </button>
                <button 
                    onClick={() => setMode('batch')}
                    className={`flex-1 py-2.5 font-bold rounded-lg transition-all text-sm flex items-center justify-center gap-2 z-10 ${mode === 'batch' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    📦 เหมาเข่ง (Batch)
                </button>
            </div>

            <div className="relative flex-1">
                <span className="absolute left-4 top-3.5 text-gray-400"><FaSearch /></span>
                <input 
                    type="text" placeholder="ค้นหาชื่อหวย..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 p-3 bg-gray-50 rounded-xl border border-transparent outline-none focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-50 transition-all"
                />
            </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400 font-bold animate-pulse">กำลังโหลดเมนู... ⏳</div>
        ) : (
          <div className="animate-fade-in">
            {mode === 'single' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                    {filteredLotteries.map((lotto) => (
                    <Link 
                        key={lotto.id} to={`/play/${lotto.id}`}
                        className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-4 border border-gray-100 group flex flex-col items-center text-center cursor-pointer relative overflow-hidden"
                    >
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-linear-to-br from-blue-50 to-indigo-50 mb-3 overflow-hidden border-2 border-white shadow-inner group-hover:scale-105 transition-transform duration-300 relative">
                            {lotto.templates?.background_url ? (
                                <img src={lotto.templates.background_url} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl opacity-50">🎲</div>
                            )}
                        </div>
                        <h3 className="font-bold text-gray-800 text-sm md:text-base group-hover:text-blue-600 line-clamp-2 leading-tight">{lotto.name}</h3>
                        {lotto.closing_time && (
                            <div className="mt-2">
                                <CountdownTimer targetDate={lotto.closing_time} />
                            </div>
                        )}
                    </Link>
                    ))}
                </div>
            )}

            {mode === 'batch' && (
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
                    
                    <div className="w-full lg:w-[320px] bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 lg:sticky lg:top-28 shrink-0">
                        <h3 className="font-extrabold text-lg mb-5 flex items-center gap-2 text-gray-800 border-b pb-4">
                            <FaCog className="text-purple-600" /> ตั้งค่า & ดาวน์โหลด
                        </h3>
                        
                        <div className="space-y-5">
                            <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-sm font-bold text-purple-900 flex items-center gap-1.5">
                                        <FaBookmark className="text-purple-500"/> กลุ่มหวยประจำ
                                    </label>
                                    <button 
                                        onClick={handleSaveGroup}
                                        className="text-[10px] bg-white border border-purple-200 text-purple-700 px-2 py-1 rounded shadow-sm hover:bg-purple-100 transition font-bold"
                                    >
                                        + บันทึกกลุ่ม
                                    </button>
                                </div>
                                
                                {savedGroups.length === 0 ? (
                                    <div className="text-xs text-gray-400 text-center py-2 bg-white/50 rounded-lg border border-dashed border-gray-200">
                                        ยังไม่มีกลุ่มที่บันทึกไว้<br/>(เลือกหวยด้านขวาแล้วกดบันทึก)
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {savedGroups.map(g => (
                                            <div key={g.id} className="relative group">
                                                <button 
                                                    onClick={() => handleApplyGroup(g)}
                                                    className="bg-white border border-purple-200 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm hover:bg-purple-600 hover:text-white transition pr-7"
                                                >
                                                    {g.name} <span className="opacity-70 font-normal">({g.lottoIds.length})</span>
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDeleteGroup(e, g.id)}
                                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-0.5"
                                                    title="ลบกลุ่มนี้"
                                                >
                                                    <FaTimes size={10}/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">วันที่บนภาพ</label>
                                    <div className="flex items-center gap-2 border border-gray-200 p-2.5 rounded-xl bg-gray-50 focus-within:ring-2 ring-blue-100 transition">
                                        <FaCalendarAlt className="text-gray-400 shrink-0" />
                                        <input type="date" value={commonDate} onChange={e => setCommonDate(e.target.value)} className="bg-transparent outline-none w-full text-sm font-medium text-gray-700"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">เลขตั้งต้น (Seed)</label>
                                    <div className="flex items-center gap-2 border border-gray-200 p-2.5 rounded-xl bg-gray-50 focus-within:ring-2 ring-blue-100 transition">
                                        <FaMagic className="text-gray-400 shrink-0" />
                                        <input type="text" value={commonSeed} onChange={e => setCommonSeed(e.target.value)} placeholder="สุ่มอัตโนมัติถ้าปล่อยว่าง" className="bg-transparent outline-none w-full text-sm font-medium text-gray-700"/>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="pt-5 border-t border-gray-100 mt-2">
                                <div className="flex justify-between items-center text-sm mb-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    <span className="text-gray-600 font-medium">เลือกหวยแล้ว:</span>
                                    <span className="font-bold text-purple-600 text-base">{selectedIds.size} รายการ</span>
                                </div>
                                <button 
                                    onClick={handleBatchDownload} 
                                    disabled={isZipping || selectedIds.size === 0} 
                                    className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 ${
                                        isZipping ? 'bg-gray-400 cursor-not-allowed shadow-none' : selectedIds.size === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' : 'bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:shadow-purple-500/30'
                                    }`}
                                >
                                    {isZipping ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div> : <FaDownload />}
                                    {isZipping ? 'กำลังประมวลผล...' : 'ดาวน์โหลด ZIP'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                <FaLayerGroup className="text-blue-500"/> ติ๊กเลือกหวยที่ต้องการสร้าง
                            </h3>
                            <button 
                                onClick={toggleAll} 
                                className="text-sm bg-blue-50 text-blue-600 font-bold px-3 py-1.5 rounded-lg hover:bg-blue-100 transition self-start sm:self-auto"
                            >
                                {selectedIds.size === filteredLotteries.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด (Select All)'}
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                            {filteredLotteries.map((lotto) => {
                                const isSelected = selectedIds.has(lotto.id);
                                return (
                                    <div 
                                        key={lotto.id} 
                                        onClick={() => toggleSelection(lotto.id)} 
                                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex items-center gap-3 relative overflow-hidden ${
                                            isSelected 
                                            ? 'border-purple-500 bg-purple-50/50 shadow-sm transform scale-[1.02]' 
                                            : 'bg-white hover:border-gray-300 hover:shadow-md border-gray-100'
                                        }`}
                                    >
                                        <div className={`text-2xl transition-colors ${isSelected ? 'text-purple-600' : 'text-gray-200 group-hover:text-gray-300'}`}>
                                            {isSelected ? <FaCheckSquare /> : <FaSquare />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`font-bold truncate text-sm ${isSelected ? 'text-purple-900' : 'text-gray-700'}`}>
                                                {lotto.name}
                                            </h4>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
          </div>
        )}
      </div>

      {isZipping && (
        <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center backdrop-blur-md">
            <div className="absolute inset-0 bg-gray-900/90 z-40"></div>
            
            <div className="relative z-50 text-white text-center flex flex-col items-center max-w-md w-full px-4">
                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <div className="text-2xl font-bold mb-2 bg-clip-text text-transparent bg-linear-to-r from-purple-400 to-pink-400">
                    กำลังสร้างภาพความเร็วสูง... 🚀
                </div>
                <div className="text-sm font-medium text-gray-300 bg-white/10 px-4 py-2 rounded-full mb-8 backdrop-blur-sm shadow-inner">
                    {progress}
                </div>
                
                <p className="text-xs text-gray-400 mt-6 bg-black/50 px-3 py-1.5 rounded-lg border border-white/10">
                    ⚠️ กรุณาอย่าปิดหน้าต่างนี้จนกว่าจะดาวน์โหลดสำเร็จ
                </p>
            </div>
        </div>
      )}

      {isTemplateModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[90vh] animate-fade-in">
                  <div className="flex justify-between items-center p-5 md:p-6 border-b border-gray-100 bg-gray-50/50">
                      <h3 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-3">
                          <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><FaPalette /></div>
                          เลือกธีมแม่พิมพ์ที่คุณต้องการ
                      </h3>
                      <button onClick={() => setIsTemplateModalOpen(false)} className="text-gray-400 hover:text-red-500 bg-white p-2 rounded-full shadow-sm border border-gray-200 transition">
                          <FaTimes />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-gray-50">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                          {myTemplates.map(t => (
                              <div 
                                key={t.id} onClick={() => handleSelectTemplate(t.id)} 
                                className={`bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl relative group ${currentTemplateId === t.id ? 'ring-4 ring-purple-500 shadow-purple-500/20 scale-[1.02]' : 'border-2 border-transparent hover:border-gray-300'}`}
                              >
                                  <div className="aspect-9/16 bg-gray-100 relative">
                                      {t.background_url ? ( <img src={t.background_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> ) : ( <div className="flex items-center justify-center h-full text-gray-300 font-bold">NO IMAGE</div> )}
                                      
                                      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                      
                                      {currentTemplateId === t.id && ( 
                                          <div className="absolute top-3 right-3 bg-purple-600 text-white rounded-full p-1.5 shadow-lg backdrop-blur-sm"> 
                                              <FaCheck size={14} /> 
                                          </div> 
                                      )}
                                  </div>
                                  <div className="p-3 bg-white absolute bottom-0 left-0 right-0 z-10 border-t border-gray-100">
                                      <h4 className="font-bold text-sm text-gray-800 truncate text-center">{t.name}</h4>
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