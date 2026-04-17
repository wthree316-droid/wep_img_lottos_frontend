import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { AdminEditorPage } from './pages/AdminEditorPage';
import { DashboardPage } from './pages/DashboardPage';
import { DashboardAdminPage } from './pages/DashboardAdminPage';
import { UserGeneratorPage } from './pages/UserGeneratorPage';
import { LoginPage } from './pages/LoginPage';
import { useAuth } from './contexts/AuthContext';
import { AdminUserWorkspacePage } from './pages/AdminUserWorkspacePage'; 
// 🛡️ ป้อมยาม: ตรวจเช็คสิทธิ์ก่อนให้เข้า
// ✅ เปลี่ยน type ของ children เป็น ReactNode (แก้ Error: Cannot find namespace 'JSX')
const ProtectedRoute = ({ children, requireAdmin = false }: { children: ReactNode, requireAdmin?: boolean }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-gray-500">กำลังตรวจสอบสิทธิ์...</div>;

  // 1. ถ้ายังไม่ Login -> ดีดไปหน้า Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. ถ้าต้องการ Admin แต่ User ไม่ใช่ Admin -> ดีดกลับไปหน้าเลือกหวย (Member Zone)
  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // ผ่านฉลุย เชิญครับนายท่าน
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      {/* 🌟 ใส่ Toaster ตรงนี้ พร้อมตั้งค่าเป็นธีม ดำ-ทอง */}
        <Toaster 
          position="top-center"
          toastOptions={{
            style: {
              background: '#121212',
              color: '#D4AF37',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
            },
            success: {
              iconTheme: { primary: '#D4AF37', secondary: '#121212' },
            },
            error: {
              style: { 
                background: '#1a0505', 
                color: '#ff6b6b', 
                border: '1px solid rgba(255, 107, 107, 0.3)' 
              },
              iconTheme: { primary: '#ff6b6b', secondary: '#1a0505' },
            },
          }}
        />
        
      <Routes>
        {/* 🔓 หน้า Login (เข้าได้ทุกคน) */}
        <Route path="/login" element={<LoginPage />} />

        {/* 👤 โซน Member (ต้อง Login ก่อน) */}
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        
        <Route path="/play/:id" element={
          <ProtectedRoute>
            <UserGeneratorPage />
          </ProtectedRoute>
        } />

        {/* 👮‍♂️ โซน Admin (ต้อง Login + เป็น Admin เท่านั้น) */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute requireAdmin={true}>
            <DashboardAdminPage />
          </ProtectedRoute>
        } />

        <Route path="/admin/create" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminEditorPage />
          </ProtectedRoute>
        } />

        <Route path="/admin/user/:userId" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminUserWorkspacePage />
          </ProtectedRoute>
        } />

        <Route path="/admin/editor/:id" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminEditorPage />
          </ProtectedRoute>
        } />
        
        {/* กันหลง: ถ้าพิมพ์ /admin เฉยๆ ให้เช็คสิทธิ์ก่อนพาไป Dashboard */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        
        {/* ถ้า User พิมพ์มั่วๆ ให้ไปหน้า Login */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;