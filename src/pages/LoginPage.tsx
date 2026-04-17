import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaLock, FaUser, FaSun } from 'react-icons/fa';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      const user = JSON.parse(localStorage.getItem('lotto_user') || '{}');
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden">
      
      {/* 🌌 Layer 1: Background Mandala Pattern (Thai Contemporary) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
        <div className="relative w-150 h-150 animate-spin-slow">
          {/* สร้างวงกลมซ้อนกันเป็นลาย Mandala ด้วย SVG */}
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#D4AF37]">
            <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="10 5" />
            <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="5 5" />
            <circle cx="100" cy="100" r="50" fill="none" stroke="currentColor" strokeWidth="2" />
            {[...Array(12)].map((_, i) => (
              <rect key={i} x="98" y="20" width="4" height="20" fill="currentColor" transform={`rotate(${i * 30} 100 100)`} rx="2" />
            ))}
          </svg>
        </div>
        {/* แสงฟุ้งสีทอง (Golden Glow) หลังการ์ด */}
        <div className="absolute w-100 h-100 bg-[#D4AF37] rounded-full blur-[120px] opacity-10"></div>
      </div>

      {/* 💳 Layer 2: The Golden Metallic Card */}
      <div className="relative z-10 w-full max-w-sm px-4">
        <div className="bg-linear-to-br from-[#BF953F] via-[#FCF6BA] to-[#B38728] p-0.5 rounded-2xl shadow-[0_0_40px_rgba(191,149,63,0.3)]">
          
          <div className="bg-[#121212] p-8 rounded-[calc(1rem-1px)] w-full">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-linear-to-tr from-[#BF953F] to-[#FCF6BA] rounded-full flex items-center justify-center mx-auto mb-4 text-black shadow-lg shadow-yellow-600/20">
                <FaSun size={32} className="animate-pulse" />
              </div>
              <h2 className="text-3xl font-black bg-linear-to-b from-[#FCF6BA] to-[#BF953F] bg-clip-text text-transparent uppercase tracking-wider">
                เข้าสู่ระบบ
              </h2>
              <div className="h-0.5 w-12 bg-[#D4AF37] mx-auto mt-2 rounded-full"></div>
              <p className="text-gray-400 text-xs mt-3 tracking-widest font-light">LOTTERY GENERATOR PREMIUM</p>
            </div>

            {error && (
              <div className="bg-red-950/30 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="group">
                <label className="block text-xs font-semibold text-[#D4AF37] mb-2 ml-1 uppercase tracking-tighter">Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37]/60 group-focus-within:text-[#D4AF37] transition-colors"><FaUser size={14} /></span>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-11 p-3 bg-black/50 border border-[#D4AF37]/20 rounded-xl text-white focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all placeholder:text-gray-600"
                    placeholder="ไอดีผู้ใช้งาน"
                    required
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-xs font-semibold text-[#D4AF37] mb-2 ml-1 uppercase tracking-tighter">Password</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37]/60 group-focus-within:text-[#D4AF37] transition-colors"><FaLock size={14} /></span>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 p-3 bg-black/50 border border-[#D4AF37]/20 rounded-xl text-white focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all placeholder:text-gray-600"
                    placeholder="รหัสผ่าน"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full mt-4 bg-linear-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-black py-4 rounded-xl font-black text-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_10px_20px_rgba(191,149,63,0.3)] uppercase"
              >
                เข้าสู่ระบบ
              </button>
            </form>
          </div>
        </div>
        
        {/* Footer Text */}
        <p className="text-center mt-8 text-gray-600 text-xs tracking-widest italic">
          © 2026 PREMIUM LOTTERY SYSTEM
        </p>
      </div>

      {/* Tailwind Custom Animation (Add this to your CSS or Tailwind Config) */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 60s linear infinite;
        }
      `}</style>
    </div>
  );
};