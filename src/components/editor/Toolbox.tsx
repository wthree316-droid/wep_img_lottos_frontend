import { useEditorStore } from '../../stores/useEditorStore';
import { DATA_KEYS } from '../../config/constants';
import { FaFont, FaQrcode, FaLine } from 'react-icons/fa';

export const Toolbox = () => {
  const { addElement } = useEditorStore();
  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col gap-4 shadow-sm z-20">
      <h2 className="font-bold text-lg mb-2 text-gray-700">เครื่องมือออกแบบ</h2>
      
      <button 
        onClick={() => addElement('text')}
        className="flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition shadow-sm border border-blue-200 font-medium"
      >
        <FaFont /> เพิ่มข้อความ (Text)
      </button>

      <div className="h-px bg-gray-100 my-1"></div>

      <button 
        onClick={() => addElement('qr_code', DATA_KEYS.QR_CODE)}
        className="flex items-center gap-3 p-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition shadow-sm border border-red-200 font-medium"
      >
        <FaQrcode /> เพิ่ม QR Code
      </button>

      <button 
        onClick={() => addElement('static_text', DATA_KEYS.LINE_ID)}
        className="flex items-center gap-3 p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition shadow-sm border border-green-200 font-medium"
      >
        <FaLine /> เพิ่มข้อความ Line ID
      </button>
      
      <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-xs text-yellow-800 border border-yellow-200">
        <strong>💡 หมายเหตุ:</strong> <br/>
        QR Code และ Line ID จะถูกดึงมาจาก <u>การตั้งค่าส่วนตัว</u> ของเจ้าของแม่พิมพ์นี้โดยอัตโนมัติ
      </div>
    </div>
  );
};