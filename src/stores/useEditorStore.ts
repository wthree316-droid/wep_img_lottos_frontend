import { create } from 'zustand';
import { DEFAULT_CANVAS_CONFIG } from '../config/constants';

export type ElementType = 'text' | 'image' | 'box';

export interface EditorElement {
  id: string;
  type: ElementType;
  label_text: string;
  dataKey?: string; 
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  style_config: {
    color: string;
    fontSize: number;
    backgroundColor?: string;
    fontFamily: string;
    textAlign: 'left' | 'center' | 'right';
    fontWeight: 'normal' | 'bold';
  };
}

interface EditorState {
  elements: EditorElement[];
  selectedId: string | null;
  canvasConfig: { width: number; height: number };
  backgroundImage: string;
  

  addElement: (type: ElementType) => void;
  updateElement: (id: string, changes: Partial<EditorElement>) => void;
  selectElement: (id: string | null) => void;
  removeElement: (id: string) => void;
  
  // ✅ เพิ่ม Actions ใหม่
  setBackgroundImage: (url: string) => void;
  setCanvasSize: (width: number, height: number) => void;
  setElements: (elements: EditorElement[]) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  elements: [],
  selectedId: null,
  canvasConfig: DEFAULT_CANVAS_CONFIG,
  backgroundImage: '',

  addElement: (type) =>
    set((state) => ({
      elements: [
        ...state.elements,
        {
          id: crypto.randomUUID(),
          type,
          label_text: type === 'text' ? 'ข้อความใหม่' : '',
          dataKey: '', 
          pos_x: 10, pos_y: 10,
          width: 20, height: 5,
          style_config: { 
            color: '#000000', 
            fontSize: 24, 
            fontFamily: 'Sarabun', 
            textAlign: 'center',
            fontWeight: 'normal'
          },
        },
      ],
    })),

  updateElement: (id, changes) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...changes } : el
      ),
    })),

  selectElement: (id) => set({ selectedId: id }),
  
  removeElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedId: null,
    })),

  // ✅ ฟังก์ชันใหม่
  setBackgroundImage: (url) => set({ backgroundImage: url }),
  setCanvasSize: (width, height) => set({ canvasConfig: { width, height } }),
  setElements: (elements) => set({ elements }),
}));