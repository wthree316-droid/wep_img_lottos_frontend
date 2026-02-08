import { useEffect, useState } from 'react';
import Moveable from 'react-moveable';
import type { OnDrag, OnResize, OnResizeEnd } from 'react-moveable'; 
import { useEditorStore } from '../../stores/useEditorStore';


// ✅ 1. เพิ่ม Interface รับค่า readOnly
interface EditorCanvasProps {
  readOnly?: boolean;
}

// ✅ 2. รับ Props เข้ามา (ค่า Default คือ false = แก้ไขได้ปกติ)
export const EditorCanvas = ({ readOnly = false }: EditorCanvasProps) => {
  const { elements, selectedId, selectElement, updateElement, canvasConfig, backgroundImage } = useEditorStore();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // 🔒 ถ้าเป็น readOnly ไม่ต้องไปหา Target (ปิดการเลือก)
    if (readOnly) {
      setTarget(null);
      return;
    }

    if (selectedId) {
      const el = document.getElementById(selectedId);
      setTarget(el);
    } else {
      setTarget(null);
    }
  }, [selectedId, elements, readOnly]);

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // 🔒 ถ้า readOnly ห้ามกด Deselect
    if (readOnly) return;

    if (e.target === container || e.currentTarget === e.target) {
      selectElement(null);
    }
  };

  return (
    // 🎨 แก้ไขจุดที่ 1: ถ้า readOnly ให้ลบ padding และ bg-gray-200 ออก ให้เหลือแค่ container เปล่าๆ
    <div className={readOnly 
        ? "w-full h-full relative overflow-hidden" // โหมดจับภาพ: เต็มจอ ไม่มีขอบ
        : "flex-1 bg-gray-200 h-full flex items-center justify-center overflow-hidden p-8 relative" // โหมดแก้ไข: มีขอบเทา
    }>
      <div
        ref={setContainer} 
        onClick={handleBackgroundClick}
        className="relative bg-white shadow-2xl origin-center"
        style={{
          aspectRatio: `${canvasConfig.width} / ${canvasConfig.height}`,
          // 🎨 แก้ไขจุดที่ 2: ถ้า readOnly ให้สูง 100% (ไม่ย่อ 90%)
          height: readOnly ? '100%' : '90%', 
          width: readOnly ? '100%' : 'auto', // บังคับกว้างเต็มถ้าจับภาพ
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'url(https://placehold.co/1080x1920/png?text=No+Image)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          userSelect: 'none', 
          pointerEvents: readOnly ? 'none' : 'auto' 
        }}
      >
        {elements.map((el) => (
          <div
            key={el.id}
            id={el.id}
            onClick={(e) => {
              if (readOnly) return;
              e.stopPropagation();
              selectElement(el.id);
            }}
            style={{
              position: 'absolute',
              left: 0, 
              top: 0,
              transform: `translate(${el.pos_x * (container?.offsetWidth || 0) / 100}px, ${el.pos_y * (container?.offsetHeight || 0) / 100}px)`,      
              width: `${el.width}%`,
              height: `${el.height}%`,
              ...el.style_config,
              fontSize: `clamp(12px, ${el.style_config.fontSize}px, 10vw)`,
              zIndex: 10,
              cursor: readOnly ? 'default' : 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: el.style_config.textAlign === 'center' ? 'center' : el.style_config.textAlign === 'right' ? 'flex-end' : 'flex-start',
              border: (!readOnly && selectedId === el.id) ? 'none' : (!readOnly ? '1px dashed rgba(0,0,0,0.2)' : 'none'),
            }}
          >
            <span style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>{el.label_text}</span>
          </div>
        ))}

        {!readOnly && (
            <Moveable
            target={target}
            container={container} 
            draggable={true}
            resizable={true}
            onDrag={({ target, transform }: OnDrag) => {
                target!.style.transform = transform;
            }}
            onDragEnd={({ target }) => {
                if (!container || !target) return;
                const style = window.getComputedStyle(target);
                const matrix = new DOMMatrix(style.transform);
                const xPx = matrix.m41;
                const yPx = matrix.m42;
                const parentWidth = container.offsetWidth;
                const parentHeight = container.offsetHeight;
                updateElement(selectedId!, {
                pos_x: (xPx / parentWidth) * 100,
                pos_y: (yPx / parentHeight) * 100,
                });
            }}
            onResize={({ target, width, height, drag }: OnResize) => {
                target!.style.width = `${width}px`;
                target!.style.height = `${height}px`;
                target!.style.transform = drag.transform;
            }}
            onResizeEnd={({ target }: OnResizeEnd) => {
                if (!container || !target) return;
                const parentWidth = container.offsetWidth;
                const parentHeight = container.offsetHeight;
                const rect = target.getBoundingClientRect();
                const parentRect = container.getBoundingClientRect();
                const relativeX = rect.left - parentRect.left;
                const relativeY = rect.top - parentRect.top;
                updateElement(selectedId!, {
                width: (rect.width / parentWidth) * 100,
                height: (rect.height / parentHeight) * 100,
                pos_x: (relativeX / parentWidth) * 100,
                pos_y: (relativeY / parentHeight) * 100,
                });
            }}
            keepRatio={false}
            throttleDrag={0}
            renderDirections={["nw", "n", "ne", "w", "e", "sw", "s", "se"]}
            padding={{ left: 0, top: 0, right: 0, bottom: 0 }}
            />
        )}
      </div>
    </div>
  );
};