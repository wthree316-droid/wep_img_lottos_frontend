import { useEffect, useRef } from 'react';
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

  // ส่ง Stage Ref กลับไปให้ Parent
  useEffect(() => {
    if (stageRef.current && onStageRef) {
      onStageRef(stageRef.current);
    }
  }, [stageRef.current, onStageRef]);

  // จัดการ Transformer
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
    <div className={readOnly 
        ? "w-full h-full relative overflow-hidden" 
        : "flex-1 bg-gray-200 h-full flex items-center justify-center overflow-hidden p-8 relative" 
    }>
      <div 
         // ✅ แก้ไข: เช็ค readOnly เพื่อซ่อนเงา (Shadow) ตอนดาวน์โหลดแน่นอน
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
            width={canvasConfig.width}
            height={canvasConfig.height}
            ref={stageRef}
            onMouseDown={checkDeselect}
            onTouchStart={checkDeselect}
            style={{ 
                transform: readOnly ? 'none' : 'scale(0.4)', 
                transformOrigin: 'center center',
                backgroundColor: 'white' // พื้นหลังสีขาวกันภาพโปร่งใส
            }}
            className="konva-stage-container" 
          >
            <Layer>
              {/* พื้นหลัง */}
              {backgroundImage ? (
                <URLImage 
                    src={backgroundImage} 
                    x={0} y={0} 
                    width={canvasConfig.width} 
                    height={canvasConfig.height} 
                    listening={false} // ✅ สำคัญ: ห้ามคลิกโดนพื้นหลัง
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
                   // ✅ ส่วนของ Text Element
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
                        fill={el.style_config.color}
                        align={el.style_config.textAlign}
                        fontStyle={el.style_config.fontWeight}
                        stroke={el.style_config.stroke}
                        strokeWidth={el.style_config.stroke ? 1 : 0}
                        shadowColor={shadowColor}
                        shadowBlur={shadowBlur}
                        shadowOffsetX={shadowOffsetX}
                        shadowOffsetY={shadowOffsetY}
                        
                        // ✅ เพิ่ม: จัดกึ่งกลางแนวตั้ง (ช่วยให้ข้อความดูไม่ลอย)
                        verticalAlign="middle"
                        // ✅ เพิ่ม: Padding (ช่วยแก้ปัญหาตัวอักษรริมขอบขาด)
                        padding={10} 
                        // ✅ เพิ่ม: LineHeight สำหรับภาษาไทย
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
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 20 || newBox.height < 20) return oldBox;
                    return newBox;
                  }}
                />
              )}
            </Layer>
          </Stage>
      </div>
      
      {!readOnly && (
          <style>{`
            .konva-stage-container {
                transform: scale(${Math.min(window.innerWidth / canvasConfig.width, (window.innerHeight - 200) / canvasConfig.height) * 0.8});
            }
          `}</style>
      )}
    </div>
  );
};