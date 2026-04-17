import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa';

export const LogoutButton = ({ className }: { className?: string }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
      try {
        await logout();
        navigate('/login');
      } catch (error) {
        console.error("Logout failed", error);
      }
    }
  };

  return (
    <button 
      onClick={handleLogout}
      className={className || "flex items-center gap-2 bg-[#1a1a1a] border border-[#D4AF37]/30 text-[#D4AF37] px-4 py-2 rounded-xl font-bold hover:bg-red-950 hover:text-red-400 hover:border-red-500/50 transition-all duration-300 text-sm shadow-sm"}
      title="ออกจากระบบ"
    >
      <FaSignOutAlt />
      <span className="hidden sm:inline">ออกจากระบบ</span>
    </button>
  );
};