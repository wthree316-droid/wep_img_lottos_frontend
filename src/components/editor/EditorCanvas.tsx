import { useEffect, useState } from 'react';
import Moveable from 'react-moveable';
import type { OnDrag, OnResize, OnResizeEnd } from 'react-moveable'; 
import { useEditorStore } from '../../stores/useEditorStore';
interface EditorCanvasProps {
  readOnly?: boolean;
}

export const EditorCanvas = ({ readOnly = false }: EditorCanvasProps) => {
  const { elements, selectedId, selectElement, updateElement, canvasConfig, backgroundImage } = useEditorStore();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
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
    if (readOnly) return;

    if (e.target === container || e.currentTarget === e.target) {
      selectElement(null);
    }
  };

  return (
    <div className={readOnly 
        ? "w-full h-full relative overflow-hidden" 
        : "flex-1 bg-gray-200 h-full flex items-center justify-center overflow-hidden p-8 relative" 
    }>
      <div
        ref={setContainer} 
        onClick={handleBackgroundClick}
        className="relative bg-white shadow-2xl origin-center"
        style={{
          aspectRatio: `${canvasConfig.width} / ${canvasConfig.height}`,
          height: readOnly ? '100%' : '90%', 
          width: readOnly ? '100%' : 'auto', 
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'url(https://placehold.co/1080x1920/png?text=No+Background)',
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
              // ✅ แก้ไข: ใช้ Pixel ตรงๆ ถ้าเป็น readOnly หรือ export เพื่อความแม่นยำ
              fontSize: `${el.style_config.fontSize}px`, 
              zIndex: 10,
              cursor: readOnly ? 'default' : 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: el.style_config.textAlign === 'center' ? 'center' : el.style_config.textAlign === 'right' ? 'flex-end' : 'flex-start',
              border: (!readOnly && selectedId === el.id) ? '2px solid #3b82f6' : (!readOnly ? '1px dashed rgba(0,0,0,0.1)' : 'none'),
              // ✅ เพิ่ม Stroke และ Shadow
              textShadow: el.style_config.textShadow,
              WebkitTextStroke: el.style_config.stroke ? `1px ${el.style_config.stroke}` : '0', // Stroke
            }}
          >
            {/* ✅ LOGIC การแสดงผลตามประเภท */}
            {el.type === 'qr_code' ? (
                // กรณีเป็น QR Code
                <img 
                    src={el.label_text || "https://placehold.co/200x200/png?text=QR"} 
                    alt="QR Code"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
            ) : (
                // กรณีเป็น Text หรือ Static Text
                <span style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                    {el.label_text}
                </span>
            )}
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
            keepRatio={false} // QR Code อาจจะอยากให้ keepRatio แต่ปล่อยอิสระไปก่อน
            throttleDrag={0}
            renderDirections={["nw", "n", "ne", "w", "e", "sw", "s", "se"]}
            padding={{ left: 0, top: 0, right: 0, bottom: 0 }}
            />
        )}
      </div>
    </div>
  );
};