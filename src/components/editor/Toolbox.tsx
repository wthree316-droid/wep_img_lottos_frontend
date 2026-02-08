import { useEditorStore } from '../../stores/useEditorStore';

export const Toolbox = () => {
  const { addElement } = useEditorStore();
  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col gap-4">
      <h2 className="font-bold text-lg mb-2">เครื่องมือ test 123</h2>
      <button 
        onClick={() => addElement('text')}
        className="p-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition shadow-sm border border-blue-200"
      >
        + เพิ่มข้อความ (Text)
      </button>
      <button 
        className="p-3 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition shadow-sm border border-green-200"
      >
        + เพิ่มรูปภาพ (Coming Soon)
      </button>
    </div>
  );
};