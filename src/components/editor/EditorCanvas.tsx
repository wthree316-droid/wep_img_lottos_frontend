import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect } from 'react-konva';
import useImage from 'use-image';
import { useEditorStore } from '../../stores/useEditorStore';

// Component ย่อยสำหรับโหลดรูปภาพ
const URLImage = ({ src, ...props }: any) => {
  const [image] = useImage(src, 'anonymous');
  return <KonvaImage image={image} {...props} />;
};

interface EditorCanvasProps {
  readOnly?: boolean;
  onStageRef?: (stage: any) => void; 
}

export const EditorCanvas = ({ readOnly = false, onStageRef }: EditorCanvasProps) => {
  const { elements, selectedId, selectElement, updateElement, canvasConfig, backgroundImage } = useEditorStore();
  
  const stageRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  
  // ✅ เพิ่ม Ref สำหรับดึงขนาดกล่อง Container ด้านนอก
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // ✅ คำนวณ Scale ให้ภาพพอดีหน้าจอ 100% เสมอ
  useEffect(() => {
    const handleResize = () => {
        if (readOnly) {
            // โหมดแสดงผล (หน้าเล่นหวย) -> ให้ขนาดพอดีกับกรอบที่ครอบมันอยู่
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                if (clientWidth > 0 && clientHeight > 0) {
                    const scaleX = clientWidth / canvasConfig.width;
                    const scaleY = clientHeight / canvasConfig.height;
                    setScale(Math.min(scaleX, scaleY));
                } else {
                    setScale(1);
                }
            }
        } else {
            // โหมดแก้ไข (หน้าแอดมิน) -> คำนวณเผื่อเครื่องมือด้านข้าง
            const padding = window.innerWidth < 768 ? 80 : 200; // ในมือถือลด Padding ลง
            const wRatio = window.innerWidth / canvasConfig.width;
            const hRatio = (window.innerHeight - padding) / canvasConfig.height;
            setScale(Math.min(wRatio, hRatio) * (window.innerWidth < 768 ? 0.9 : 0.8));
        }
    };

    handleResize(); // คำนวณครั้งแรก
    
    // ตั้งเวลาเผื่อ DOM โหลดเสร็จช้าในเสี้ยววินาที
    const timer = setTimeout(handleResize, 100);

    window.addEventListener('resize', handleResize);
    return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(timer);
    };
  }, [readOnly, canvasConfig.width, canvasConfig.height]);

  // ส่ง Stage Ref กลับไปให้ Parent
  useEffect(() => {
    if (stageRef.current && onStageRef) {
      onStageRef(stageRef.current);
    }
  }, [stageRef.current, onStageRef]);

  // จัดการ Transformer (กรอบย่อ/ขยายข้อความ)
  useEffect(() => {
    if (readOnly || !trRef.current || !stageRef.current) return;

    const selectedNode = stageRef.current.findOne('.' + selectedId);
    if (selectedNode) {
      trRef.current.nodes([selectedNode]);
      trRef.current.getLayer().batchDraw();
    } else {
      trRef.current.nodes([]);
      trRef.current.getLayer().batchDraw();
    }
  }, [selectedId, elements, readOnly]);

  const toPx = (percent: number, base: number) => (percent * base) / 100;
  const toPct = (px: number, base: number) => (px / base) * 100;

  const checkDeselect = (e: any) => {
    if (readOnly) return;
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      selectElement(null);
    }
  };

  return (
    <div 
        ref={containerRef} // ✅ ผูก Ref ไว้ตรงนี้เพื่อดึงขนาดหน้าจอ
        className={readOnly 
            ? "w-full h-full relative overflow-hidden flex items-center justify-center" // ✅ เพิ่ม flex center 
            : "flex-1 bg-gray-200 h-full flex items-center justify-center overflow-hidden p-8 relative" 
        }
    >
      <div 
         className={readOnly ? "" : "shadow-2xl"}
         style={{
             width: '100%', 
             height: '100%', 
             display: 'flex', 
             justifyContent: 'center', 
             alignItems: 'center'
         }}
      >
          <Stage
            // ✅ 1. ย่อขนาด Canvas ใน RAM ให้เท่ากับที่ตาเห็น (ลดการกินสเปคเครื่อง 10 เท่า)
            width={canvasConfig.width * scale}
            height={canvasConfig.height * scale}
            // ✅ 2. ให้ Konva จัดการย่อขยายพิกัดอัตโนมัติ (ไม่ต้องใช้ CSS)
            scaleX={scale}
            scaleY={scale}
            
            ref={stageRef}
            onMouseDown={checkDeselect}
            onTouchStart={checkDeselect}
            style={{ backgroundColor: 'white' }} 
          >
            <Layer>
              {/* พื้นหลัง */}
              {backgroundImage ? (
                <URLImage 
                    src={backgroundImage} 
                    x={0} y={0} 
                    width={canvasConfig.width} 
                    height={canvasConfig.height} 
                    listening={false}
                />
              ) : (
                <Rect width={canvasConfig.width} height={canvasConfig.height} fill="white" listening={false} />
              )}

              {/* Elements */}
              {elements.map((el) => {
                const x = toPx(el.pos_x, canvasConfig.width);
                const y = toPx(el.pos_y, canvasConfig.height);
                const w = toPx(el.width, canvasConfig.width);
                const h = toPx(el.height, canvasConfig.height);

                if (el.type === 'qr_code') {
                   return (
                     <URLImage
                        key={el.id}
                        id={el.id}
                        name={el.id}
                        src={el.label_text || "https://placehold.co/200x200/png?text=QR"}
                        x={x} y={y}
                        width={w} height={h}
                        draggable={!readOnly}
                        onClick={() => !readOnly && selectElement(el.id)}
                        onDragEnd={(e: any) => {
                            updateElement(el.id, {
                                pos_x: toPct(e.target.x(), canvasConfig.width),
                                pos_y: toPct(e.target.y(), canvasConfig.height),
                            });
                        }}
                        onTransformEnd={(e: any) => {
                            const node = e.target;
                            const scaleX = node.scaleX();
                            const scaleY = node.scaleY();
                            node.scaleX(1);
                            node.scaleY(1);
                            updateElement(el.id, {
                                pos_x: toPct(node.x(), canvasConfig.width),
                                pos_y: toPct(node.y(), canvasConfig.height),
                                width: toPct(node.width() * scaleX, canvasConfig.width),
                                height: toPct(node.height() * scaleY, canvasConfig.height),
                            });
                        }}
                     />
                   );
                } else {
                   // Text Element
                   const currentColors = el.style_config.gradientColors || [el.style_config.color];
                   const isGradient = currentColors.length > 1;
                   
                   let colorStops: (string | number)[] = [];
                   if (isGradient) {
                       currentColors.forEach((color, index) => {
                           const position = index / (currentColors.length - 1);
                           colorStops.push(position, color);
                       });
                   }

                   let shadowBlur = 0, shadowColor = 'transparent', shadowOffsetX = 0, shadowOffsetY = 0;
                   if (el.style_config.textShadow) {
                       const parts = el.style_config.textShadow.split(' ');
                       if (parts.length >= 4) {
                           shadowOffsetX = parseInt(parts[0]);
                           shadowOffsetY = parseInt(parts[1]);
                           shadowBlur = parseInt(parts[2]);
                           shadowColor = parts[3];
                       }
                   }

                   return (
                     <Text
                        key={el.id}
                        id={el.id}
                        name={el.id}
                        text={el.label_text}
                        x={x} y={y}
                        width={w} height={h}
                        fontSize={el.style_config.fontSize}
                        fontFamily={el.style_config.fontFamily}
                        
                        fill={isGradient ? undefined : currentColors[0]}
                        fillPriority={isGradient ? 'linear-gradient' : 'color'}
                        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                        fillLinearGradientEndPoint={{ x: 0, y: h }}
                        fillLinearGradientColorStops={colorStops}
                        
                        align={el.style_config.textAlign}
                        fontStyle={el.style_config.fontWeight}
                        stroke={el.style_config.stroke}
                        strokeWidth={el.style_config.stroke ? (el.style_config.strokeWidth || 1) : 0}
                        shadowColor={shadowColor}
                        shadowBlur={shadowBlur}
                        shadowOffsetX={shadowOffsetX}
                        shadowOffsetY={shadowOffsetY}
                        verticalAlign="middle"
                        padding={10} 
                        lineHeight={1.4}
                        draggable={!readOnly}
                        onClick={() => !readOnly && selectElement(el.id)}
                        onTap={() => !readOnly && selectElement(el.id)}
                        onDragEnd={(e) => {
                            updateElement(el.id, {
                                pos_x: toPct(e.target.x(), canvasConfig.width),
                                pos_y: toPct(e.target.y(), canvasConfig.height),
                            });
                        }}
                        onTransformEnd={(e) => {
                            const node = e.target;
                            const scaleX = node.scaleX();
                            node.scaleX(1);
                            node.scaleY(1);
                            updateElement(el.id, {
                                pos_x: toPct(node.x(), canvasConfig.width),
                                pos_y: toPct(node.y(), canvasConfig.height),
                                width: toPct(node.width() * scaleX, canvasConfig.width),
                                style_config: {
                                    ...el.style_config,
                                    fontSize: Math.round(el.style_config.fontSize * scaleX)
                                }
                            });
                        }}
                     />
                   );
                }
              })}

              {!readOnly && selectedId && (
                <Transformer
                  ref={trRef}
                  // ✅ เพิ่ม 4 บรรทัดนี้ เพื่อให้จุดลากใหญ่ขึ้นในมือถือ
                  anchorSize={typeof window !== 'undefined' && window.innerWidth < 768 ? 25 : 10} 
                  anchorCornerRadius={3}
                  borderStrokeWidth={1.5}
                  padding={5}
                  // ==========================
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 20 || newBox.height < 20) return oldBox;
                    return newBox;
                  }}
                />
              )}
            </Layer>
          </Stage>
      </div>
    </div>
  );
};