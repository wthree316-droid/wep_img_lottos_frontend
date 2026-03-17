
// ==========================================
// 🎨 1. ตั้งค่าฟอนต์ทั้งหมด (Fonts Configuration)
// ==========================================
export const AVAILABLE_FONTS = [
    { label: 'Sarabun (สารบัญ)', value: 'Sarabun' },
    { label: 'Kanit (คณิต)', value: 'Kanit' },
    { label: 'Prompt (พร้อม)', value: 'Prompt' },
    { label: 'Mitr (มิตร)', value: 'Mitr' },
    { label: 'Chakra Petch (จักรเพชร)', value: 'Chakra Petch' },
    { label: 'Taviraj (ทวิราช)', value: 'Taviraj' },
    { label: 'Pridi (ปรีดี)', value: 'Pridi' },
    { label: 'K2D (เคทูดี)', value: 'K2D' },
    { label: 'Itim (ไอติม)', value: 'Itim' },
    { label: 'Mali (มะลิ)', value: 'Mali' },
    { label: 'Sriracha (ศรีราชา)', value: 'Sriracha' },
    
    // ⬇️ อยากเพิ่มฟอนต์พิเศษ ก๊อปปี้บรรทัดล่างนี้ไปแก้ได้เลย ⬇️
    // { label: 'FC Palit (ฟอนต์ลายมือ)', value: 'FC-Palit' },
];

// ==========================================
// ✨ 2. ตั้งค่าสไตล์สำเร็จรูป (Preset Styles)
// ==========================================
export const DEFAULT_STYLES = [
    { 
        name: 'ขาวขอบดำ', 
        style: { color: '#ffffff', stroke: '#000000', textShadow: '2px 2px 4px rgba(0,0,0,0.5)', fontWeight: 'bold' } 
    },
    { 
        name: 'ทองพรีเมียม', 
        style: { color: 'gold', stroke: '#8a6300', textShadow: '2px 2px 6px rgba(0,0,0,0.8)', fontWeight: 'bold' } 
    },
    { 
        name: 'เงินหรูหรา', 
        style: { color: 'silver', stroke: '#555555', textShadow: '2px 2px 4px rgba(0,0,0,0.6)', fontWeight: 'bold' } 
    },
    { 
        name: 'นีออนชมพู', 
        style: { color: '#ffffff', stroke: '#ff00ff', textShadow: '0px 0px 8px #ff00ff', fontWeight: 'bold' } 
    },
    { 
        name: 'เหลืองขอบแดง', 
        style: { color: '#ffff00', stroke: '#ff0000', textShadow: '2px 2px 0px #8b0000', fontWeight: 'bold' } 
    },
    
    // ⬇️ อยากเพิ่มสไตล์ใหม่ ก๊อปปี้บรรทัดบนมาแก้สีได้เลย ⬇️
];