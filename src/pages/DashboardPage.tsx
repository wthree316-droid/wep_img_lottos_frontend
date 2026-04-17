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
import toast from 'react-hot-toast';

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
        <span className={`text-[10px] flex items-center justify-center gap-1.5 px-3 py-1 rounded-full font-bold tracking-wider uppercase border shadow-inner transition-colors ${
            isExpired 
            ? 'bg-black/50 text-gray-600 border-gray-800' 
            : 'bg-red-950/40 text-red-400 animate-pulse border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
        }`}>
            <FaClock size={10} /> {timeLeft}
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
        toast.error('โหลดข้อมูลหวยไม่สำเร็จ (โปรดรีเฟรช): ' + (err.message || err));
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
      if (selectedIds.size === 0) return toast.error("กรุณาติ๊กเลือกหวยอย่างน้อย 1 ใบก่อนบันทึกกลุ่ม");
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
      toast.success(`✅ บันทึกกลุ่ม "${name}" เรียบร้อยแล้ว`);
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
          } else { toast.error("คุณยังไม่มีธีมให้เลือก (โปรดสร้างแม่พิมพ์ใหม่ หรือติดต่อแอดมิน)"); }
      } catch (e) { console.error(e); toast.error("โหลดข้อมูลไม่สำเร็จ"); }
  };

  const handleSelectTemplate = async (templateId: string) => { 
      try {
          if (!user) return;
          await apiClient.put(`/api/users/${user.id}`, { assigned_template_id: templateId });
          setCurrentTemplateId(templateId);
          toast.success("✅ เปลี่ยนธีมสำเร็จ! กำลังรีโหลด...");
          window.location.reload(); 
      } catch (e) { console.error(e); toast.error("เปลี่ยนธีมไม่สำเร็จ"); }
  };

  // 🚀 ฟังก์ชันโหลดเหมาเข่งแบบ Turbo
  const handleBatchDownload = async () => {
    if (selectedIds.size === 0) return toast.error("กรุณาเลือกหวยอย่างน้อย 1 ใบ");
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

        if (failedItems.length > 0) toast.success(`สร้างเสร็จแล้ว แต่มีล้มเหลว ${failedItems.length} รายการ:\n${failedItems.join('\n')}`);

    } catch (error: any) { 
        toast.error("เกิดข้อผิดพลาด: " + (error.message || error)); 
    } 
    finally { setIsZipping(false); setProgress(''); }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-20 relative overflow-x-hidden">
      
      {/* 🌌 Background Mandala (แบบจางๆ ให้ดูขลัง) */}
      <div className="fixed top-[-10%] right-[-10%] w-150 h-150 opacity-[0.3] pointer-events-none z-0">
        <svg viewBox="0 0 200 200" className="w-full h-full text-[#D4AF37] animate-spin-slow">
          <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="10 5" />
          <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="5 5" />
          <circle cx="100" cy="100" r="50" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>

      {/* 🧭 Navigation Bar (Glassmorphism) */}
      <div className="bg-[#121212]/80 backdrop-blur-md border-b border-[#D4AF37]/20 sticky top-0 z-40 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-3">
                 <div className="w-8 h-8 bg-linear-to-tr from-[#BF953F] to-[#FCF6BA] rounded-md flex items-center justify-center text-black shadow-lg shadow-yellow-600/20">
                   <FaLayerGroup size={16} />
                 </div>
                 <span className="bg-linear-to-r from-[#FCF6BA] via-[#D4AF37] to-[#BF953F] bg-clip-text text-transparent uppercase">Lotto Studio</span>
              </h1>
              <p className="text-xs md:text-sm text-gray-400 mt-1 flex items-center gap-1.5">
                 ยินดีต้อนรับ, <span className="text-[#D4AF37] font-bold bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-2 py-0.5 rounded-md">{user?.name || user?.username}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-3 overflow-x-auto pb-1 hide-scrollbar">
              <button 
                  onClick={handleOpenTemplateModal}
                  className="flex items-center gap-2 bg-[#1a1a1a] border border-[#D4AF37]/40 text-[#D4AF37] px-4 py-2 rounded-xl font-bold hover:bg-linear-to-r hover:from-[#BF953F] hover:via-[#FCF6BA] hover:to-[#B38728] hover:text-black hover:border-transparent transition-all duration-300 text-sm whitespace-nowrap shadow-sm hover:shadow-[0_0_15px_rgba(212,175,55,0.4)]"
              >
                  <FaPalette /> ธีมแม่พิมพ์
              </button>
              {isAdmin && (
                  <Link to="/admin/dashboard" className="flex items-center gap-2 bg-black border border-gray-700 text-gray-300 px-4 py-2 rounded-xl font-bold hover:text-white hover:border-gray-500 transition text-sm whitespace-nowrap">
                    <FaCog /> แอดมิน
                  </Link>
              )}
              <div className="h-8 w-px bg-[#D4AF37]/20 hidden md:block"></div>
              <LogoutButton />
            </div>
          </div>
      </div>

      {/* 🌟 Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 relative z-10">
        
        {/* 🎛️ จุดที่ 2: Control Panel (Toggle Mode & Search) */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8 bg-[#121212] p-2 rounded-2xl shadow-lg shadow-yellow-900/5 border border-[#D4AF37]/20">
            
            {/* 🔄 Mode Toggle (สลับโหมด) */}
            <div className="flex bg-[#050505] p-1.5 rounded-xl flex-1 lg:max-w-md relative border border-[#D4AF37]/10">
                <button 
                    onClick={() => setMode('single')}
                    className={`flex-1 py-2.5 font-bold rounded-lg transition-all duration-300 text-sm flex items-center justify-center gap-2 z-10 ${
                      mode === 'single' 
                        ? 'bg-linear-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' 
                        : 'text-gray-500 hover:text-[#D4AF37]'
                    }`}
                >
                    🎯 เลือกทีละใบ
                </button>
                <button 
                    onClick={() => setMode('batch')}
                    className={`flex-1 py-2.5 font-bold rounded-lg transition-all duration-300 text-sm flex items-center justify-center gap-2 z-10 ${
                      mode === 'batch' 
                        ? 'bg-linear-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' 
                        : 'text-gray-500 hover:text-[#D4AF37]'
                    }`}
                >
                    📦 เลือกทีละหลายใบ
                </button>
            </div>

            {/* 🔍 Search Bar (ช่องค้นหา) */}
            <div className="relative flex-1 group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37]/40 group-focus-within:text-[#D4AF37] transition-colors">
                  <FaSearch />
                </span>
                <input 
                    type="text" 
                    placeholder="ค้นหาชื่อหวย..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 p-3 bg-[#050505] text-white placeholder-gray-600 rounded-xl border border-[#D4AF37]/20 outline-none focus:bg-[#1a1a1a] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all shadow-inner"
                />
            </div>
        </div>

        {/* --- ส่วน Loading --- */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#D4AF37]">
            <div className="w-12 h-12 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin mb-4"></div>
            <p className="font-bold tracking-widest uppercase text-sm animate-pulse">กำลังโหลดเมนูมงคล... ⏳</p>
          </div>
        ) : (
          <div className="animate-fade-in">
            {mode === 'single' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                    {filteredLotteries.map((lotto) => (
                    <Link 
                        key={lotto.id} to={`/play/${lotto.id}`}
                        className="bg-[#121212] rounded-2xl shadow-lg hover:shadow-[0_0_25px_rgba(212,175,55,0.2)] transition-all duration-300 transform hover:-translate-y-1.5 p-5 border border-[#D4AF37]/20 hover:border-[#D4AF37]/60 group flex flex-col items-center text-center cursor-pointer relative overflow-hidden"
                    >
                        {/* แสงฟุ้งสีทองด้านหลังตอน Hover (Glow Effect) */}
                        <div className="absolute inset-0 bg-linear-to-b from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                        {/* กรอบรูปวงกลม */}
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#0a0a0a] mb-4 overflow-hidden border-2 border-[#D4AF37]/30 group-hover:border-[#D4AF37] shadow-inner group-hover:scale-110 transition-all duration-500 relative flex items-center justify-center z-10">
                            {lotto.templates?.background_url ? (
                                <img 
                                    src={lotto.icon_url || lotto.templates?.background_url || "https://placehold.co/400x400/png?text=No+Image"} 
                                    alt={lotto.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <div className="text-3xl opacity-30 grayscale group-hover:grayscale-0 transition-all">🎲</div>
                            )}
                        </div>

                        {/* ชื่อหวย */}
                        <h3 className="font-bold text-gray-300 text-sm md:text-base group-hover:text-[#D4AF37] transition-colors line-clamp-2 leading-snug mb-3 z-10">
                            {lotto.name}
                        </h3>

                        {/* เวลาปิดรับ */}
                        {lotto.closing_time && (
                            <div className="mt-auto z-10 w-full">
                                <CountdownTimer targetDate={lotto.closing_time} />
                            </div>
                        )}
                    </Link>
                    ))}
                </div>
            )}

            {mode === 'batch' && (
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
                    
                    {/* 🎛️ แผงควบคุมด้านซ้าย (Left Panel) */}
                    <div className="w-full lg:w-[320px] bg-[#121212] p-6 rounded-3xl shadow-2xl border border-[#D4AF37]/20 lg:sticky lg:top-28 shrink-0 relative overflow-hidden">
                        {/* แสงฟุ้งประดับตกแต่งมุมกล่อง */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] opacity-5 blur-[50px] pointer-events-none"></div>

                        <h3 className="font-black text-lg mb-5 flex items-center gap-2 text-white border-b border-[#D4AF37]/20 pb-4 uppercase tracking-wider">
                            <FaCog className="text-[#D4AF37]" /> ตั้งค่า & ดาวน์โหลด
                        </h3>
                        
                        <div className="space-y-6 relative z-10">
                            {/* ส่วนบันทึกกลุ่มหวย */}
                            <div className="bg-[#050505] p-4 rounded-2xl border border-[#D4AF37]/10">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-sm font-bold text-[#D4AF37] flex items-center gap-1.5 uppercase tracking-wide">
                                        <FaBookmark /> กลุ่มหวยประจำ
                                    </label>
                                    <button 
                                        onClick={handleSaveGroup}
                                        className="text-[10px] bg-[#1a1a1a] border border-[#D4AF37]/30 text-[#D4AF37] px-2 py-1 rounded shadow-sm hover:bg-[#D4AF37] hover:text-black transition font-bold"
                                    >
                                        + บันทึกกลุ่ม
                                    </button>
                                </div>
                                
                                {savedGroups.length === 0 ? (
                                    <div className="text-xs text-gray-600 text-center py-4 bg-[#121212] rounded-lg border border-dashed border-gray-800">
                                        ยังไม่มีกลุ่มที่บันทึกไว้<br/>(เลือกหวยด้านขวาแล้วกดบันทึก)
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {savedGroups.map(g => (
                                            <div key={g.id} className="relative group">
                                                <button 
                                                    onClick={() => handleApplyGroup(g)}
                                                    className="bg-[#1a1a1a] border border-[#D4AF37]/20 text-gray-300 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm hover:border-[#D4AF37] hover:text-[#D4AF37] transition pr-7"
                                                >
                                                    {g.name} <span className="opacity-60 font-normal">({g.lottoIds.length})</span>
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDeleteGroup(e, g.id)}
                                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-0.5"
                                                    title="ลบกลุ่มนี้"
                                                >
                                                    <FaTimes size={10}/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ส่วนตั้งค่า วันที่ & Seed */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">วันที่บนภาพ</label>
                                    <div className="flex items-center gap-2 border border-[#D4AF37]/20 p-3 rounded-xl bg-[#0a0a0a] focus-within:border-[#D4AF37] focus-within:ring-1 ring-[#D4AF37] transition">
                                        <FaCalendarAlt className="text-[#D4AF37]/60 shrink-0" />
                                        {/* ใช้ [color-scheme:dark] เพื่อให้ Datepicker ของ Browser เป็นธีมมืด */}
                                        <input type="date" value={commonDate} onChange={e => setCommonDate(e.target.value)} className="bg-transparent outline-none w-full text-sm font-medium text-white scheme-dark"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">เลขตั้งต้น (Seed)</label>
                                    <div className="flex items-center gap-2 border border-[#D4AF37]/20 p-3 rounded-xl bg-[#0a0a0a] focus-within:border-[#D4AF37] focus-within:ring-1 ring-[#D4AF37] transition">
                                        <FaMagic className="text-[#D4AF37]/60 shrink-0" />
                                        <input type="text" value={commonSeed} onChange={e => setCommonSeed(e.target.value)} placeholder="สุ่มอัตโนมัติถ้าปล่อยว่าง" className="bg-transparent outline-none w-full text-sm font-medium text-white placeholder-gray-700"/>
                                    </div>
                                </div>
                            </div>
                            
                            {/* ส่วนสรุปผลและปุ่มดาวน์โหลด */}
                            <div className="pt-5 border-t border-[#D4AF37]/10 mt-2">
                                <div className="flex justify-between items-center text-sm mb-4 bg-[#0a0a0a] p-3 rounded-xl border border-[#D4AF37]/10">
                                    <span className="text-gray-400 font-medium">เลือกหวยแล้ว:</span>
                                    <span className="font-bold text-[#D4AF37] text-lg">{selectedIds.size} รายการ</span>
                                </div>
                                <button 
                                    onClick={handleBatchDownload} 
                                    disabled={isZipping || selectedIds.size === 0} 
                                    className={`w-full py-4 rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-95 ${
                                        isZipping 
                                        ? 'bg-[#1a1a1a] text-gray-600 border border-gray-800 cursor-not-allowed shadow-none' 
                                        : selectedIds.size === 0 
                                            ? 'bg-[#0a0a0a] text-gray-700 border border-gray-800 cursor-not-allowed shadow-none' 
                                            : 'bg-linear-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-black hover:brightness-110 shadow-[0_0_20px_rgba(212,175,55,0.3)]'
                                    }`}
                                >
                                    {isZipping ? <div className="animate-spin h-5 w-5 border-2 border-gray-600 border-t-[#D4AF37] rounded-full"></div> : <FaDownload />}
                                    {isZipping ? 'กำลังประมวลผล...' : 'ดาวน์โหลด ZIP'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 📝 รายการหวยด้านขวา (Right Panel) */}
                    <div className="flex-1 w-full">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-5 gap-3 bg-[#121212] p-4 rounded-xl shadow-lg border border-[#D4AF37]/20">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <FaLayerGroup className="text-[#D4AF37]"/> ติ๊กเลือกหวยที่ต้องการสร้าง
                            </h3>
                            <button 
                                onClick={toggleAll} 
                                className="text-xs bg-[#1a1a1a] text-[#D4AF37] border border-[#D4AF37]/30 font-bold px-4 py-2 rounded-lg hover:bg-[#D4AF37] hover:text-black transition-colors self-start sm:self-auto uppercase tracking-wider"
                            >
                                {selectedIds.size === filteredLotteries.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด (Select All)'}
                            </button>
                        </div>
                        
                        {/* ตารางกล่องหวยให้กดเลือก */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                            {filteredLotteries.map((lotto) => {
                                const isSelected = selectedIds.has(lotto.id);
                                return (
                                    <div 
                                        key={lotto.id} 
                                        onClick={() => toggleSelection(lotto.id)} 
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 flex items-center gap-3 relative overflow-hidden group ${
                                            isSelected 
                                            ? 'border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_15px_rgba(212,175,55,0.15)] transform scale-[1.02]' 
                                            : 'bg-[#121212] border-[#D4AF37]/10 hover:border-[#D4AF37]/40 hover:bg-[#1a1a1a]'
                                        }`}
                                    >
                                        <div className={`text-2xl transition-colors ${isSelected ? 'text-[#D4AF37]' : 'text-gray-700 group-hover:text-gray-500'}`}>
                                            {isSelected ? <FaCheckSquare /> : <FaSquare />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`font-bold truncate text-sm transition-colors ${isSelected ? 'text-[#D4AF37]' : 'text-gray-300'}`}>
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

      {/* 🚀 1. ป๊อปอัป Loading (ตอนกำลังประมวลผลเหมาเข่ง) */}
      {isZipping && (
        <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center backdrop-blur-md">
            <div className="absolute inset-0 bg-[#050505]/90 z-40"></div>
            
            <div className="relative z-50 text-white text-center flex flex-col items-center max-w-md w-full px-4">
                {/* วงแหวน Loading สีทอง */}
                <div className="relative w-20 h-20 mb-8">
                    <div className="absolute inset-0 border-4 border-[#D4AF37]/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(212,175,55,0.5)]"></div>
                    {/* ไอคอนสายฟ้าตรงกลาง */}
                    <div className="absolute inset-0 flex items-center justify-center text-[#FCF6BA] animate-pulse">
                        <FaMagic size={24} />
                    </div>
                </div>

                <div className="text-3xl font-black mb-3 bg-clip-text text-transparent bg-linear-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] uppercase tracking-widest drop-shadow-[0_2px_10px_rgba(212,175,55,0.4)]">
                    กำลังสร้างภาพ...
                </div>
                
                <div className="text-sm font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-6 py-2.5 rounded-full mb-8 backdrop-blur-sm shadow-[inset_0_0_10px_rgba(212,175,55,0.1)] border border-[#D4AF37]/30">
                    {progress}
                </div>
                
                <p className="text-xs text-gray-500 mt-6 bg-black/80 px-4 py-2 rounded-xl border border-red-900/30 flex items-center gap-2">
                    <span className="text-red-500 animate-pulse">⚠️</span> กรุณาอย่าปิดหน้าต่างนี้จนกว่าจะดาวน์โหลดสำเร็จ
                </p>
            </div>
        </div>
      )}

      {/* 🎨 2. ป๊อปอัป เลือกธีมแม่พิมพ์ (Template Modal) */}
      {isTemplateModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-[#121212] rounded-3xl shadow-[0_0_40px_rgba(212,175,55,0.15)] border border-[#D4AF37]/30 w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh] animate-fade-in relative">
                  
                  {/* แสงฟุ้งพื้นหลัง Modal */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-125 h-32 bg-[#D4AF37] opacity-10 blur-[60px] pointer-events-none"></div>

                  <div className="flex justify-between items-center p-5 md:p-6 border-b border-[#D4AF37]/20 bg-[#0a0a0a]/50 relative z-10">
                      <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-3">
                          <div className="bg-linear-to-br from-[#BF953F] to-[#FCF6BA] p-2 rounded-lg text-black shadow-lg shadow-yellow-600/20">
                              <FaPalette />
                          </div>
                          เลือกธีมแม่พิมพ์นำโชค
                      </h3>
                      <button onClick={() => setIsTemplateModalOpen(false)} className="text-gray-500 hover:text-[#D4AF37] bg-black p-2 rounded-full border border-gray-800 hover:border-[#D4AF37]/50 transition-all">
                          <FaTimes />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-[#050505] relative z-10 custom-scrollbar">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                          {myTemplates.map(t => {
                              const isActive = currentTemplateId === t.id;
                              return (
                                <div 
                                    key={t.id} onClick={() => handleSelectTemplate(t.id)} 
                                    className={`bg-[#1a1a1a] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 relative group ${
                                        isActive 
                                        ? 'ring-2 ring-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.3)] scale-[1.02]' 
                                        : 'border border-[#D4AF37]/10 hover:border-[#D4AF37]/50'
                                    }`}
                                >
                                    <div className="aspect-9/16 bg-[#0a0a0a] relative flex items-center justify-center">
                                        {t.background_url ? ( 
                                            <img src={t.background_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /> 
                                        ) : ( 
                                            <div className="flex flex-col items-center justify-center text-gray-700 font-bold opacity-50">
                                                <FaLayerGroup size={24} className="mb-2" />
                                                <span className="text-xs">NO IMAGE</span>
                                            </div> 
                                        )}
                                        
                                        <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
                                        
                                        {isActive && ( 
                                            <div className="absolute top-3 right-3 bg-linear-to-tr from-[#BF953F] to-[#FCF6BA] text-black rounded-full p-1.5 shadow-[0_0_15px_rgba(212,175,55,0.5)] z-10"> 
                                                <FaCheck size={14} /> 
                                            </div> 
                                        )}

                                        <div className="p-4 absolute bottom-0 left-0 right-0 z-10 text-center">
                                            <h4 className={`font-bold text-sm truncate transition-colors ${isActive ? 'text-[#D4AF37]' : 'text-gray-300 group-hover:text-white'}`}>
                                                {t.name}
                                            </h4>
                                        </div>
                                    </div>
                                </div>
                              )
                          })}
                      </div>
                  </div>
              </div>
          </div>
      )}
    {/* Animation Style */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 120s linear infinite;
        }
      `}</style>
    </div>
  );
};