import { create } from 'zustand';
import { DEFAULT_CANVAS_CONFIG, DATA_KEYS } from '../config/constants';

// ✅ เพิ่ม type
export type ElementType = 'text' | 'image' | 'qr_code' | 'static_text';

export interface EditorElement {
  id: string;
  type: ElementType;
  label_text: string;
  dataKey?: string; 
  image_url?: string; // ✅ เพิ่มเผื่อรูปภาพ/QR
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  style_config: {
    color: string;
    gradientColors?: string[];
    fontSize: number;
    backgroundColor?: string;
    fontFamily: string;
    textAlign: 'left' | 'center' | 'right';
    fontWeight: 'normal' | 'bold';
    textShadow?: string; // ✅ เพิ่ม textShadow
    stroke?: string; // ✅ เพิ่มขอบตัวหนังสือ
    strokeWidth?: number;
  };
}

interface EditorState {
  elements: EditorElement[];
  selectedId: string | null;
  canvasConfig: { width: number; height: number };
  backgroundImage: string;
  
  addElement: (type: ElementType, dataKey?: string) => void;
  updateElement: (id: string, changes: Partial<EditorElement>) => void;
  
  // ✅ เพิ่มบรรทัดนี้: ฟังก์ชันสำหรับอัปเดตสไตล์ทั้งหมด
  updateAllElementsStyle: (styleChanges: Partial<EditorElement['style_config']>) => void; 
  
  selectElement: (id: string | null) => void;
  removeElement: (id: string) => void;
  setBackgroundImage: (url: string) => void;
  setCanvasSize: (width: number, height: number) => void;
  setElements: (elements: EditorElement[]) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  elements: [],
  selectedId: null,
  canvasConfig: DEFAULT_CANVAS_CONFIG,
  backgroundImage: '',

  addElement: (type, dataKey) =>
    set((state) => {
        const id = crypto.randomUUID();
        let label_text = '';
        let width = 60;
        let height = 10;
        const fontSize = Math.round(state.canvasConfig.height * 0.05);

        if (type === 'text') {
            label_text = 'ข้อความใหม่';
        } else if (type === 'qr_code') {
            label_text = ''; // QR Code ใช้ image_url แต่เก็บใน label_text ชั่วคราวหรือรอ API
            width = 25; // สี่เหลี่ยมจัตุรัส
            height = (width * state.canvasConfig.width) / state.canvasConfig.height; // คำนวณ aspect ratio ให้เป็นจัตุรัสตามหน้าจอ
        } else if (type === 'static_text') {
            label_text = '{Line ID}';
            if (dataKey === DATA_KEYS.LINE_ID) label_text = '{Line ID System}';
        }

        return {
            elements: [
                ...state.elements,
                {
                    id,
                    type,
                    label_text,
                    dataKey: dataKey || '', 
                    pos_x: 10, pos_y: 10,
                    width, height,
                    style_config: { 
                        color: '#000000', 
                        fontSize, 
                        fontFamily: 'Sarabun', 
                        textAlign: 'center',
                        fontWeight: 'normal'
                    },
                },
            ],
        };
    }),

  updateElement: (id, changes) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...changes } : el
      ),
    })),

  // ✅ เพิ่มบล็อกนี้ลงไป: วนลูปแก้เฉพาะ Text / Static_Text ไม่ยุ่งกับรูปภาพหรือ QR
  updateAllElementsStyle: (styleChanges) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.type !== 'qr_code' && el.type !== 'image'
          ? { ...el, style_config: { ...el.style_config, ...styleChanges } }
          : el
      ),
    })),

  selectElement: (id) => set({ selectedId: id }),
  
  removeElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedId: null,
    })),

  setBackgroundImage: (url) => set({ backgroundImage: url }),
  setCanvasSize: (width, height) => set({ canvasConfig: { width, height } }),
  setElements: (elements) => set({ elements }),

}));
