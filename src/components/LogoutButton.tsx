import { useAuth } from '../contexts/AuthContext';
import { FaSignOutAlt } from 'react-icons/fa';

export const LogoutButton = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    if (confirm("ต้องการออกจากระบบใช่ไหม?")) {
      logout();
    }
  };

  return (
    <button 
      onClick={handleLogout}
      className="flex items-center gap-2 text-red-500 hover:text-red-700 font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition"
    >
      <FaSignOutAlt /> ออกจากระบบ
    </button>
  );
};