import { useState, useEffect } from 'react';
import { useEditorStore } from '../../stores/useEditorStore';
import { 
  FaAlignLeft, FaAlignCenter, FaAlignRight, FaTrash, FaDatabase, FaImage, FaSave, FaMagic, FaPlus, FaGripLines, FaCopy, FaBold, FaArrowUp, FaArrowDown, FaCheck
} from 'react-icons/fa';
import { API_BASE_URL } from '../../config/api';
import { AVAILABLE_FONTS, DEFAULT_STYLES } from '../../config/editorConfigs';
import toast from 'react-hot-toast';


const StyleEffectControl = ({ label, value, onChange }: { label: string, value?: string, onChange: (val: string) => void }) => {
    return (
        <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase flex justify-between">
                {label}
                {value && (
                    <button onClick={() => onChange('')} className="text-[10px] text-red-500 hover:underline">ลบ</button>
                )}
            </label>
            <div className="flex gap-2">
                {['#000000', '#ffffff', '#ff0000', '#0000ff', '#ffff00'].map(color => (
                    <button
                        key={color} onClick={() => onChange(color)}
                        className={`w-6 h-6 rounded-full border border-gray-300 shadow-sm transition ${value === color ? 'ring-2 ring-blue-500 scale-110' : ''}`}
                        style={{ backgroundColor: color }}
                    />
                ))}
                <div className="w-6 h-6 rounded-full border border-gray-300 relative overflow-hidden">
                    <input type="color" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => onChange(e.target.value)} />
                    <div className="w-full h-full bg-linear-to-br from-gray-100 to-gray-300 flex items-center justify-center text-[8px] text-gray-500">+</div>
                </div>
            </div>
        </div>
    );
};

export const Properties = () => {

  const { elements, selectedId, updateElement, removeElement, canvasConfig, setCanvasSize, backgroundImage, setBackgroundImage, updateAllElementsStyle } = useEditorStore();
  
  // ✅ เพิ่ม Local State สำหรับเก็บค่าที่กำลังพิมพ์
  const [tempSize, setTempSize] = useState({ width: canvasConfig.width, height: canvasConfig.height });

  // เมื่อ canvasConfig ใน Store เปลี่ยน (เช่น ตอนโหลดแม่พิมพ์ใหม่) ให้ Sync ค่ามาที่นี่ด้วย
  useEffect(() => {
    setTempSize({ width: canvasConfig.width, height: canvasConfig.height });
  }, [canvasConfig.width, canvasConfig.height]);

  const handleApplySize = () => {
    // ยืนยันค่า: ต้องมากกว่า 0 และไม่ใช่ค่าว่าง
    const w = Math.max(10, tempSize.width || 0);
    const h = Math.max(10, tempSize.height || 0);
    setCanvasSize(w, h);
    setTempSize({ width: w, height: h });
    toast.success("ปรับขนาดพื้นที่วาดเรียบร้อย");
  };

  const selectedElement = elements.find((el) => el.id === selectedId);
  const [isUploading, setIsUploading] = useState(false);

  // 💾 State สำหรับเก็บสไตล์ที่ผู้ใช้บันทึกเอง (ดึงจาก LocalStorage)
  const [savedStyles, setSavedStyles] = useState<any[]>([]);

  useEffect(() => {
      const localStyles = localStorage.getItem('lotto_custom_styles');
      if (localStyles) setSavedStyles(JSON.parse(localStyles));
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... (โค้ด Upload เหมือนเดิม)
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setBackgroundImage(data.url);
    } catch (error: any) {
      alert('อัปโหลดไม่ผ่าน: ' + (error.message || error));
    } finally {
      setIsUploading(false);
    }
  };

  // ✅ ฟังก์ชัน: กดนำสไตล์ไปใช้
  const applyStyle = (presetStyle: any) => {
      if (!selectedElement) return;
      updateElement(selectedElement.id, {
          style_config: {
              ...selectedElement.style_config,
              color: presetStyle.color || '#000000',
              stroke: presetStyle.stroke || '',
              textShadow: presetStyle.textShadow || '',
              fontWeight: presetStyle.fontWeight || 'normal',
              // ปรับฟอนต์ด้วยถ้ามีบันทึกไว้
              ...(presetStyle.fontFamily ? { fontFamily: presetStyle.fontFamily } : {})
          }
      });
  };

  // ✅ ฟังก์ชัน: บันทึกสไตล์ปัจจุบันเก็บไว้
  const saveCurrentStyle = () => {
      if (!selectedElement) return;
      const name = prompt("ตั้งชื่อให้สไตล์นี้ (เช่น สไตล์ตัวเลขรางวัล):");
      if (!name) return;

      const newStyle = {
          name,
          style: {
              color: selectedElement.style_config.color,
              stroke: selectedElement.style_config.stroke,
              textShadow: selectedElement.style_config.textShadow,
              fontWeight: selectedElement.style_config.fontWeight,
              fontFamily: selectedElement.style_config.fontFamily,
          }
      };

      const updatedStyles = [...savedStyles, newStyle];
      setSavedStyles(updatedStyles);
      localStorage.setItem('lotto_custom_styles', JSON.stringify(updatedStyles));
      alert("✅ บันทึกสไตล์สำเร็จ!");
  };

  // ✅ ฟังก์ชันลบสไตล์ที่สร้างเอง
  const deleteSavedStyle = (indexToRemove: number) => {
      if (!confirm("ต้องการลบสไตล์นี้ใช่ไหม?")) return;
      const updatedStyles = savedStyles.filter((_, idx) => idx !== indexToRemove);
      setSavedStyles(updatedStyles);
      localStorage.setItem('lotto_custom_styles', JSON.stringify(updatedStyles));
  };


  if (!selectedElement) {
    return (

        <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full shadow-lg z-20">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-bold text-gray-700 text-lg flex items-center gap-2"><FaImage className="text-gray-500" />ตั้งค่าแม่พิมพ์</h2>
            </div>
            <div className="p-6 flex flex-col gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">ขนาด (กว้าง x สูง)</label>
                    <div className="flex gap-2">
                        <input 
                            type="number" 
                            value={tempSize.width === 0 ? '' : tempSize.width} 
                            onChange={(e) => setTempSize({ ...tempSize, width: parseInt(e.target.value) || 0 })}
                            className="w-full p-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500" 
                            placeholder="กว้าง"
                        />
                        <span className="text-gray-400 self-center">x</span>
                        <input 
                            type="number" 
                            value={tempSize.height === 0 ? '' : tempSize.height} 
                            onChange={(e) => setTempSize({ ...tempSize, height: parseInt(e.target.value) || 0 })}
                            className="w-full p-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500" 
                            placeholder="สูง"
                        />
                    </div>
                    
                    {/* ✅ เพิ่มปุ่มยืนยันขนาด (จะโชว์เฉพาะตอนค่าไม่ตรงกับ Store) */}
                    {(tempSize.width !== canvasConfig.width || tempSize.height !== canvasConfig.height) && (
                    <button 
                        onClick={handleApplySize}
                        className="w-full mt-2 bg-blue-600 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-1 shadow-md animate-pulse"
                    >
                        <FaCheck /> ยืนยันขนาด
                    </button>
                    )}
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">รูปพื้นหลัง</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition relative">
                        {isUploading ? <span className="text-sm text-blue-500">กำลังอัปโหลด... ⏳</span> : <><span className="text-sm text-gray-500">คลิกเพื่อเลือกรูป</span><input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" /></>}
                    </div>
                    <input type="text" value={backgroundImage || ''} onChange={(e) => setBackgroundImage(e.target.value)} className="w-full p-2 border border-gray-200 rounded text-sm text-gray-400 mt-2" placeholder="หรือใส่ URL ตรงนี้..." />
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full shadow-lg z-20">
      <div className="p-4 border-b border-gray-100 bg-blue-50">
        <h2 className="font-bold text-blue-900 text-lg flex items-center gap-2">
          <FaDatabase className="text-blue-500" /> แก้ไขข้อความ
        </h2>
        <p className="text-xs text-blue-300 mt-1">ID: {selectedElement.id.slice(0, 8)}...</p>
      </div>

      <div className="p-6 flex flex-col gap-6 overflow-y-auto">
        
        {/* Type Selection */}
        <div className="space-y-2 p-3 bg-white border border-blue-100 rounded-lg shadow-sm">
          <label className="text-xs font-bold text-blue-800 uppercase tracking-wider">ชนิดข้อมูล</label>
          <select
            value={selectedElement.dataKey || ''}
            onChange={(e) => {
                const val = e.target.value;
                let newText = selectedElement.label_text;
                if (val === 'lottery_name') newText = '{ชื่อหวย}';
                else if (val === 'lottery_date') newText = '{วันที่}';
                else if (val === 'digit_3') newText = '{3 ตัว}';
                else if (val === 'digit_2_top') newText = '{บน}';
                else if (val === 'digit_2_bottom') newText = '{ล่าง}';
                else if (val === 'running') newText = '{วิ่ง}';
                else if (val === 'win') newText = '{วิน}';
                updateElement(selectedElement.id, { dataKey: val, label_text: newText });
            }}
            className="w-full p-2 border border-blue-300 rounded text-sm text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">📝 ข้อความ (พิมพ์เอง)</option>
            <option value="lottery_name">🏷️ ชื่อหวย</option>
            <option value="lottery_date">📅 วันที่</option>
            <option value="digit_3">🎰 เลข 3 ตัว</option>
            <option value="digit_2_top">⬆️ 2 ตัวบน</option>
            <option value="digit_2_bottom">⬇️ 2 ตัวล่าง</option>
            <option value="running">🏃 เลขวิ่ง</option>
            <option value="win">🔢 เลขวิน</option>
          </select>
        </div>

        {/* Content Input */}
        {!selectedElement.dataKey && selectedElement.type !== 'qr_code' && (
            <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ข้อความ</label>
            <textarea
                rows={2}
                value={selectedElement.label_text}
                onChange={(e) => updateElement(selectedElement.id, { label_text: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
            />
            </div>
        )}

        {/* 🌟 โซนสไตล์สำเร็จรูป (Presets) 🌟 */}
        {selectedElement.type !== 'qr_code' && (
            <div className="p-3 bg-linear-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-100 space-y-3">
                <div className="flex justify-between items-center mb-1">
                    <h3 className="text-xs font-bold text-purple-800 flex items-center gap-1"><FaMagic /> สไตล์สำเร็จรูป</h3>
                    <button onClick={saveCurrentStyle} className="text-[10px] bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 flex items-center gap-1 shadow-sm">
                        <FaSave /> บันทึก
                    </button>
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                    {/* สไตล์ Default */}
                    {DEFAULT_STYLES.map((preset, idx) => (
                        <button 
                            key={`default-${idx}`}
                            onClick={() => applyStyle(preset.style)}
                            className="snap-start shrink-0 px-3 py-2 rounded-lg border bg-white hover:border-purple-500 hover:shadow-md transition flex flex-col items-center justify-center min-w-17.5"
                        >
                            <span className="text-sm" style={{ fontWeight: preset.style.fontWeight as any }}>Aa</span>
                            <span className="text-[9px] text-gray-500 mt-1 truncate w-full text-center">{preset.name}</span>
                        </button>
                    ))}
                    
                    {/* สไตล์ที่ผู้ใช้บันทึกเอง */}
                    {savedStyles.map((preset, idx) => (
                        <div key={`custom-${idx}`} className="relative group shrink-0 snap-start">
                            <button 
                                onClick={() => applyStyle(preset.style)}
                                className="w-full h-full px-3 py-2 rounded-lg border bg-white border-blue-200 hover:border-blue-500 hover:shadow-md transition flex flex-col items-center justify-center min-w-17.5"
                            >
                                <span className="text-sm text-blue-600" style={{ fontWeight: preset.style.fontWeight as any }}>Aa</span>
                                <span className="text-[9px] text-blue-600 mt-1 truncate w-full text-center">{preset.name}</span>
                            </button>
                            <button 
                                onClick={() => deleteSavedStyle(idx)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow-sm"
                            >
                                <FaTrash size={8} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* ---------------- โซนปรับแต่งแบบละเอียด ---------------- */}
        
        {selectedElement.type !== 'qr_code' && (
            <div className="flex flex-col gap-6 border-t border-gray-100 pt-4 mt-2">
                
                {/* 1. ขนาดตัวอักษร (Font Size) */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ขนาด</label>
                        <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                            {selectedElement.style_config.fontSize}
                        </span>
                    </div>
                    <input
                        type="range" min="12" max="300" step="1"
                        value={selectedElement.style_config.fontSize}
                        onChange={(e) => {
                            // ✅ Fix: คำนวณอัตราส่วนการขยาย เพื่อให้กล่องขยายตามตัวอักษร
                            const newFontSize = parseInt(e.target.value);
                            const oldFontSize = selectedElement.style_config.fontSize || 1;
                            const scaleRatio = newFontSize / oldFontSize; 

                            updateElement(selectedElement.id, { 
                                width: selectedElement.width * scaleRatio,   // ขยายกล่องกว้างขึ้น
                                height: selectedElement.height * scaleRatio, // ขยายกล่องสูงขึ้น
                                style_config: { ...selectedElement.style_config, fontSize: newFontSize } 
                            });
                        }}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase">สไตล์</label>
                        <button
                            onClick={() => updateElement(selectedElement.id, { 
                                style_config: { ...selectedElement.style_config, fontWeight: selectedElement.style_config.fontWeight === 'bold' ? 'normal' : 'bold' } 
                            })}
                            className={`w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 border transition ${selectedElement.style_config.fontWeight === 'bold' ? 'bg-blue-600 text-white border-blue-600 shadow-inner' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                            <FaBold /> {selectedElement.style_config.fontWeight === 'bold' ? 'ตัวหนา' : 'ปกติ'}
                        </button>
                    </div>
                </div>
                
                {/* 2. แบบตัวอักษร (Font Family) */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">แบบตัวอักษร</label>
                    <div className="flex gap-2"> {/* ✅ เพิ่ม flex คู่กับปุ่ม */}
                        <select
                            value={selectedElement.style_config.fontFamily}
                            onChange={(e) => updateElement(selectedElement.id, { 
                                style_config: { ...selectedElement.style_config, fontFamily: e.target.value } 
                            })}
                            className="flex-1 p-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                            style={{ fontFamily: selectedElement.style_config.fontFamily }}
                        >
                            {AVAILABLE_FONTS.map((font) => (
                                <option key={font.value} value={font.value}>
                                    {font.label}
                                </option>
                            ))}
                        </select>
                        
                        {/* ✅ ปุ่ม: ใช้ฟอนต์นี้กับทั้งหมด */}
                        <button
                            onClick={() => {
                                if (confirm(`ต้องการเปลี่ยนฟอนต์ทุกข้อความเป็น "${selectedElement.style_config.fontFamily}" ใช่หรือไม่?`)) {
                                    updateAllElementsStyle({ fontFamily: selectedElement.style_config.fontFamily });
                                }
                            }}
                            className="px-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition flex items-center justify-center border border-blue-200 font-bold text-xs"
                            title="ใช้ฟอนต์นี้กับทุกข้อความ"
                        >
                            ทั้งหมด
                        </button>
                    </div>
                </div>

                {/* 3. เอฟเฟกต์ ขอบ และ เงา (Stroke & Shadow) */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-5">
                    <h3 className="text-xs font-bold text-gray-600 border-b pb-2">เอฟเฟกต์ 🎨</h3>

                    {/* เลือกสีพื้นหลังข้อความ */}
                    <StyleEffectControl 
                        label="สีพื้นหลังข้อความ" 
                        value={selectedElement.style_config.backgroundColor}
                        onChange={(color) => updateElement(selectedElement.id, { 
                            style_config: { ...selectedElement.style_config, backgroundColor: color } 
                        })}
                    />
                    
                    {/* ขอบ (Stroke) */}
                    <div className="space-y-3">
                        <StyleEffectControl 
                            label="ขอบตัวหนังสือ (Stroke)" 
                            value={selectedElement.style_config.stroke}
                            onChange={(color) => updateElement(selectedElement.id, { 
                                style_config: { ...selectedElement.style_config, stroke: color } 
                            })}
                        />
                        {/* ✅ Slider ความหนาขอบ ปรับ Max=10 และโชว์เป็น % */}
                        {selectedElement.style_config.stroke && (
                            <div className="bg-white p-2 rounded border border-gray-200 space-y-2">
                                <div className="flex justify-between">
                                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ความหนาขอบ</label>
                                    <span className="text-[10px] text-blue-600 font-bold">
                                        {(selectedElement.style_config.strokeWidth || 1) * 10}%
                                    </span>
                                </div>
                                <input
                                    type="range" min="1" max="10" step="1"
                                    value={selectedElement.style_config.strokeWidth || 1}
                                    onChange={(e) => updateElement(selectedElement.id, { 
                                        style_config: { ...selectedElement.style_config, strokeWidth: parseInt(e.target.value) } 
                                    })}
                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                            </div>
                        )}
                    </div>

                    {/* เงา (Shadow) */}
                    <StyleEffectControl 
                        label="เงา (Shadow)" 
                        // ✅ แก้บัค: สกัดเอาเฉพาะค่าสีตัวสุดท้ายมาเช็ค กรอบฟ้าจะได้ขึ้น
                        value={selectedElement.style_config.textShadow ? selectedElement.style_config.textShadow.split(' ').pop() : ''}
                        onChange={(color) => {
                            const shadowVal = color ? `2px 2px 4px ${color}` : '';
                            updateElement(selectedElement.id, { 
                                style_config: { ...selectedElement.style_config, textShadow: shadowVal } 
                            });
                        }}
                    />
                </div>

                {/* 4. สี และ การไล่สี (Color & Gradient) */}
                <div className="space-y-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
                            สีตัวอักษร / ไล่สี
                        </label>
                        <button
                            onClick={() => {
                                const currentColors = selectedElement.style_config.gradientColors || [selectedElement.style_config.color];
                                updateElement(selectedElement.id, {
                                    style_config: { ...selectedElement.style_config, gradientColors: [...currentColors, '#ffffff'] }
                                });
                            }}
                            className="text-[10px] flex items-center gap-1 bg-white border border-blue-200 text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition shadow-sm"
                        >
                            <FaPlus /> เพิ่มสี
                        </button>
                    </div>

                    <div className="space-y-2">
                        {(selectedElement.style_config.gradientColors || [selectedElement.style_config.color]).map((color, index, array) => (
                            <div 
                                key={index} 
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData('idx', index.toString())}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const fromIdx = parseInt(e.dataTransfer.getData('idx'));
                                    const toIdx = index;
                                    if (fromIdx === toIdx) return;

                                    const newColors = [...array];
                                    const [moved] = newColors.splice(fromIdx, 1);
                                    newColors.splice(toIdx, 0, moved);

                                    updateElement(selectedElement.id, {
                                        style_config: { ...selectedElement.style_config, gradientColors: newColors }
                                    });
                                }}
                                className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm cursor-move hover:border-blue-400 transition group"
                            >
                                {/* ไอคอนสำหรับลาก (Drag Handle) */}
                                <div className="text-gray-300 px-1 cursor-grab active:cursor-grabbing hover:text-blue-500">
                                    <FaGripLines size={14} />
                                </div>

                                {/* ✅ ปุ่มลูกศร ขึ้น-ลง (สำหรับมือถือและคนชอบกด) */}
                                <div className="flex flex-col gap-1 md:hidden text-gray-400">
                                    <button 
                                        onClick={() => {
                                            if (index === 0) return;
                                            const newColors = [...array];
                                            [newColors[index - 1], newColors[index]] = [newColors[index], newColors[index - 1]];
                                            updateElement(selectedElement.id, { style_config: { ...selectedElement.style_config, gradientColors: newColors }});
                                        }} 
                                        disabled={index === 0}
                                        className="p-1 hover:text-blue-500 disabled:opacity-20 active:bg-gray-100 rounded"
                                    ><FaArrowUp size={10} /></button>
                                    <button 
                                        onClick={() => {
                                            if (index === array.length - 1) return;
                                            const newColors = [...array];
                                            [newColors[index + 1], newColors[index]] = [newColors[index], newColors[index + 1]];
                                            updateElement(selectedElement.id, { style_config: { ...selectedElement.style_config, gradientColors: newColors }});
                                        }}
                                        disabled={index === array.length - 1}
                                        className="p-1 hover:text-blue-500 disabled:opacity-20 active:bg-gray-100 rounded"
                                    ><FaArrowDown size={10} /></button>
                                </div>
                                
                                {/* กล่องเลือกสี */}
                                <div className="flex-1 flex items-center gap-3">
                                    <div className="relative w-8 h-8 rounded-full border-2 border-gray-100 shadow-inner overflow-hidden shrink-0">
                                        <input
                                            type="color"
                                            value={color.startsWith('#') ? color : '#000000'}
                                            onChange={(e) => {
                                                const newColors = [...array];
                                                newColors[index] = e.target.value;
                                                updateElement(selectedElement.id, {
                                                    style_config: { 
                                                        ...selectedElement.style_config, 
                                                        gradientColors: newColors,
                                                        color: newColors[0] // อัปเดตสีหลัก (fallback) ให้ตรงกับสีแรกเสมอ
                                                    }
                                                });
                                            }}
                                            className="absolute inset-0 w-[200%] h-[200%] -top-2 -left-2 cursor-pointer"
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500 font-mono uppercase">{color}</span>
                                </div>

                                {/* ปุ่มลบสี (จะโชว์ก็ต่อเมื่อมีมากกว่า 1 สี) */}
                                {array.length > 1 && (
                                    <button
                                        onClick={() => {
                                            const newColors = array.filter((_, i) => i !== index);
                                            updateElement(selectedElement.id, {
                                                style_config: { 
                                                    ...selectedElement.style_config, 
                                                    gradientColors: newColors,
                                                    color: newColors[0]
                                                }
                                            });
                                        }}
                                        className="text-gray-300 hover:text-red-500 p-1.5 opacity-0 group-hover:opacity-100 transition rounded hover:bg-red-50"
                                        title="ลบสีนี้"
                                    >
                                        <FaTrash size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    {/* คำแนะนำ */}
                    {selectedElement.style_config.gradientColors && selectedElement.style_config.gradientColors.length > 1 && (
                        <p className="text-[10px] text-blue-600/70 text-center mt-2">
                            💡 ไล่สีจากบนลงล่าง ลากสลับตำแหน่งได้
                        </p>
                    )}
                </div>

                {/* 5. การจัดกึ่งกลาง (Text Alignment) */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">จัดหน้ากระดาษ</label>
                    <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                    {['left', 'center', 'right'].map((align) => (
                        <button
                            key={align}
                            onClick={() => updateElement(selectedElement.id, { 
                                style_config: { ...selectedElement.style_config, textAlign: align as any } 
                            })}
                            className={`flex-1 p-2 rounded-md flex justify-center transition ${
                                selectedElement.style_config.textAlign === align 
                                ? 'bg-white shadow-sm text-blue-600 font-bold' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            {align === 'left' && <FaAlignLeft />}
                            {align === 'center' && <FaAlignCenter />}
                            {align === 'right' && <FaAlignRight />}
                        </button>
                    ))}
                    </div>
                </div>

                {/* ✅ เพิ่มปุ่มวิเศษ: นำสไตล์ปัจจุบันไปใช้กับทุกกล่อง */}
                <div className="pt-4 mt-2 border-t border-purple-100">
                    <button
                        onClick={() => {
                            if (confirm('ต้องการนำสไตล์นี้ (สี, ฟอนต์, ขอบ, เงา) ไปใช้กับ "ทุกข้อความ" ในแม่พิมพ์นี้ใช่หรือไม่?')) {
                                updateAllElementsStyle({
                                    color: selectedElement.style_config.color,
                                    gradientColors: selectedElement.style_config.gradientColors,
                                    stroke: selectedElement.style_config.stroke,
                                    strokeWidth: selectedElement.style_config.strokeWidth,
                                    textShadow: selectedElement.style_config.textShadow,
                                    fontWeight: selectedElement.style_config.fontWeight,
                                    fontFamily: selectedElement.style_config.fontFamily,
                                });
                            }
                        }}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-linear-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-md hover:from-indigo-600 hover:to-purple-700 transition font-bold text-sm transform hover:scale-105"
                    >
                        <FaCopy size={16} />
                        ใช้สไตล์นี้กับทุกข้อความ
                    </button>
                </div>

            </div>
        )}

        {/* Delete */}
        <div className="pt-4 border-t border-gray-100 mt-auto">

            {/* ✅ Fix ข้อ 9: โซนปรับแต่งพิเศษสำหรับ QR Code */}
            {selectedElement.type === 'qr_code' && (
                <div className="flex flex-col gap-6 border-t border-gray-100 pt-4 mt-2">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-5">
                        <h3 className="text-xs font-bold text-gray-600 border-b pb-2">กรอบรูป QR Code 🔲</h3>
                        <StyleEffectControl 
                            label="สีเส้นขอบ" 
                            value={selectedElement.style_config.stroke}
                            onChange={(color) => updateElement(selectedElement.id, { 
                                style_config: { ...selectedElement.style_config, stroke: color } 
                            })}
                        />
                        {selectedElement.style_config.stroke && (
                            <div className="bg-white p-2 rounded border border-gray-200 space-y-2">
                                <div className="flex justify-between">
                                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ความหนาขอบ</label>
                                    <span className="text-[10px] text-blue-600 font-bold">
                                        {selectedElement.style_config.strokeWidth || 1} px
                                    </span>
                                </div>
                                <input
                                    type="range" min="1" max="20" step="1"
                                    value={selectedElement.style_config.strokeWidth || 1}
                                    onChange={(e) => updateElement(selectedElement.id, { 
                                        style_config: { ...selectedElement.style_config, strokeWidth: parseInt(e.target.value) } 
                                    })}
                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            <button
                onClick={() => removeElement(selectedElement.id)}
                className="w-full flex items-center justify-center gap-2 p-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition font-medium text-sm"
            >
                <FaTrash size={14} />
                ลบกล่องนี้
            </button>
        </div>

      </div>
    </div>
  );
};