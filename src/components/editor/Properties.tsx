import { useState } from 'react';
import { useEditorStore } from '../../stores/useEditorStore';
import { 
  FaAlignLeft, FaAlignCenter, FaAlignRight, FaTrash, FaDatabase, FaImage, FaBold 
} from 'react-icons/fa';
import { API_BASE_URL } from '../../config/api';

export const Properties = () => {
  const { 
    elements, selectedId, updateElement, removeElement, 
    canvasConfig, setCanvasSize, backgroundImage, setBackgroundImage 
  } = useEditorStore();

  const selectedElement = elements.find((el) => el.id === selectedId);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      setBackgroundImage(data.url);
      
    } catch (error: any) {
      console.error(error);
      alert('อัปโหลดไม่ผ่าน: ' + (error.message || error));
    } finally {
      setIsUploading(false);
    }
  };

  if (!selectedElement) {
    // ... (ส่วนตั้งค่าแม่พิมพ์ เหมือนเดิมไม่ต้องแก้) ...
    return (
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full shadow-lg z-20">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-gray-700 text-lg flex items-center gap-2">
            <FaImage className="text-gray-500" />
            ตั้งค่าแม่พิมพ์
          </h2>
        </div>
        
        <div className="p-6 flex flex-col gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">ขนาด (กว้าง x สูง)</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                value={canvasConfig.width}
                onChange={(e) => setCanvasSize(parseInt(e.target.value), canvasConfig.height)}
                className="w-full p-2 border border-gray-200 rounded text-sm"
                placeholder="W"
              />
              <span className="text-gray-400 self-center">x</span>
              <input 
                type="number" 
                value={canvasConfig.height}
                onChange={(e) => setCanvasSize(canvasConfig.width, parseInt(e.target.value))}
                className="w-full p-2 border border-gray-200 rounded text-sm"
                placeholder="H"
              />
            </div>
            <p className="text-xs text-gray-400">ค่าเริ่มต้น: 1080 x 1920 (TikTok/Reels)</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">รูปพื้นหลัง</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition relative">
                {isUploading ? (
                    <span className="text-sm text-blue-500">กำลังอัปโหลด... ⏳</span>
                ) : (
                    <>
                        <span className="text-sm text-gray-500">คลิกเพื่อเลือกรูปจากเครื่อง</span>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </>
                )}
            </div>
            <input 
              type="text" 
              value={backgroundImage || ''}
              onChange={(e) => setBackgroundImage(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded text-sm text-gray-400 mt-2"
              placeholder="หรือใส่ URL ตรงนี้..."
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full shadow-lg z-20">
      <div className="p-4 border-b border-gray-100 bg-blue-50">
        <h2 className="font-bold text-blue-900 text-lg flex items-center gap-2">
          <FaDatabase className="text-blue-500" />
          แก้ไขข้อความ
        </h2>
        <p className="text-xs text-blue-300 mt-1">ID: {selectedElement.id.slice(0, 8)}...</p>
      </div>

      <div className="p-6 flex flex-col gap-6 overflow-y-auto">
        
        {/* Type Selection */}
        <div className="space-y-2 p-3 bg-white border border-blue-100 rounded-lg shadow-sm">
          <label className="text-xs font-bold text-blue-800 uppercase tracking-wider">
            ชนิดข้อมูล
          </label>
          <select
            value={selectedElement.dataKey || ''}
            onChange={(e) => {
                const val = e.target.value;
                let newText = selectedElement.label_text;
                if (val === 'lottery_name') newText = '{ชื่อหวย}';
                else if (val === 'lottery_date') newText = '{วันที่}';
                else if (val === 'digit_3') newText = '{เลข 3 ตัว}';
                else if (val === 'digit_2_top') newText = '{2 ตัวบน}';
                else if (val === 'digit_2_bottom') newText = '{2 ตัวล่าง}';
                else if (val === 'running') newText = '{เลขวิ่ง}';
                else if (val === 'win') newText = '{เลขวิน}';
                
                updateElement(selectedElement.id, { 
                    dataKey: val,
                    label_text: newText 
                });
            }}
            className="w-full p-2 border border-blue-300 rounded text-sm text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">📝 ข้อความธรรมดา (Static)</option>
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
        {!selectedElement.dataKey && (
            <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ข้อความ</label>
            <textarea
                rows={3}
                value={selectedElement.label_text}
                onChange={(e) => updateElement(selectedElement.id, { label_text: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
            />
            </div>
        )}

        {/* Font Size & Weight */}
        <div className="grid grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
                <div className="flex justify-between">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ขนาด (px)</label>
                    <span className="text-xs text-blue-600 font-bold">{selectedElement.style_config.fontSize}px</span>
                </div>
                <input
                    type="range"
                    min="12" max="300" step="1"
                    value={selectedElement.style_config.fontSize}
                    onChange={(e) => updateElement(selectedElement.id, { 
                    style_config: { ...selectedElement.style_config, fontSize: parseInt(e.target.value) } 
                    })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
            </div>

            {/* ✅ ปุ่มตัวหนา */}
            <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase">สไตล์</label>
                <button
                    onClick={() => updateElement(selectedElement.id, {
                        style_config: { 
                            ...selectedElement.style_config, 
                            fontWeight: selectedElement.style_config.fontWeight === 'bold' ? 'normal' : 'bold' 
                        }
                    })}
                    className={`w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 border transition ${
                        selectedElement.style_config.fontWeight === 'bold'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    <FaBold /> {selectedElement.style_config.fontWeight === 'bold' ? 'ตัวหนา' : 'ปกติ'}
                </button>
            </div>
        </div>
        
        {/* Font Family */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">แบบตัวอักษร</label>
          <select
            value={selectedElement.style_config.fontFamily}
            onChange={(e) => updateElement(selectedElement.id, { 
              style_config: { ...selectedElement.style_config, fontFamily: e.target.value } 
            })}
            className="w-full p-2 border border-gray-200 rounded text-sm text-gray-700 outline-none"
            style={{ fontFamily: selectedElement.style_config.fontFamily }}
          >
             <option value="Sarabun">Sarabun (สารบัญ)</option>
             <option value="Kanit">Kanit (คณิต)</option>
             <option value="Prompt">Prompt (พร้อม)</option>
             <option value="Mitr">Mitr (มิตร)</option>
             <option value="Chakra Petch">Chakra Petch (จักรเพชร)</option>
             <option value="Taviraj">Taviraj (ทวิราช)</option>
             <option value="Pridi">Pridi (ปรีดี)</option>
             <option value="K2D">K2D (เคทูดี)</option>
             <option value="Itim">Itim (ไอติม)</option>
             <option value="Mali">Mali (มะลิ)</option>
             <option value="Sriracha">Sriracha (ศรีราชา)</option>
          </select>
        </div>

        {/* Color & Align */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">สีตัวอักษร</label>
            <div className="flex items-center gap-2 border border-gray-200 p-2 rounded-lg cursor-pointer hover:bg-gray-50 relative">
              <div 
                className="w-6 h-6 rounded-full border border-gray-300 shadow-sm" 
                style={{ backgroundColor: selectedElement.style_config.color }}
              />
              <input
                type="color"
                value={selectedElement.style_config.color}
                onChange={(e) => updateElement(selectedElement.id, { 
                  style_config: { ...selectedElement.style_config, color: e.target.value } 
                })}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-2">
             <label className="text-xs font-semibold text-gray-500 uppercase">จัดกึ่งกลาง</label>
             <div className="flex bg-gray-100 rounded-lg p-1">
               {['left', 'center', 'right'].map((align) => (
                 <button
                   key={align}
                   onClick={() => updateElement(selectedElement.id, { 
                     style_config: { ...selectedElement.style_config, textAlign: align as any } 
                   })}
                   className={`flex-1 p-2 rounded-md flex justify-center transition ${
                     selectedElement.style_config.textAlign === align 
                       ? 'bg-white shadow-sm text-blue-600' 
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
        </div>

        {/* Delete */}
        <div className="pt-4 border-t border-gray-100">
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