// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Public
import HomePage     from './pages/Home';
import LoginPage    from './pages/auth/Login';
import RegisterPage from './pages/auth/Register';
import OfflinePage  from './pages/Offline';

// User dashboard
import DashboardLayout  from './components/layout/DashboardLayout';
import DashboardHome    from './pages/user/Dashboard';
import MySkills         from './pages/user/MySkills';
import BrowseSkills     from './pages/user/BrowseSkills';
import SkillDetail      from './pages/user/SkillDetail';
import MyRequests       from './pages/user/MyRequests';
import Wallet           from './pages/user/Wallet';
import Ratings          from './pages/user/Ratings';
import ProfilePage      from './pages/user/Profile';
import MessagesPage     from './pages/user/Messages';

// Admin dashboard
import AdminLayout      from './components/layout/AdminLayout';
import AdminDashboard   from './pages/admin/AdminDashboard';
import AdminUsers       from './pages/admin/AdminUsers';
import AdminSessions    from './pages/admin/AdminSessions';
import AdminDisputes    from './pages/admin/AdminDisputes';
import AdminAnalytics   from './pages/admin/AdminAnalytics';

// ── Guards ────────────────────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen bg-surface-400 flex items-center justify-center">
    <div className="w-10 h-10 border-2 border-maroon-950 border-t-transparent rounded-full animate-spin" />
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'admin' ? children : <Navigate to="/dashboard" replace />;
};

// ── Inner app wrapped in socket provider ─────────────────
function AppRoutes() {
  return (
    <SocketProvider>
      <Routes>
        {/* Public */}
        <Route path="/"         element={<HomePage />} />
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/offline"  element={<OfflinePage />} />

        {/* User Dashboard */}
        <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
          <Route index              element={<DashboardHome />} />
          <Route path="skills"      element={<MySkills />} />
          <Route path="browse"      element={<BrowseSkills />} />
          <Route path="browse/:id"  element={<SkillDetail />} />
          <Route path="requests"    element={<MyRequests />} />
          <Route path="wallet"      element={<Wallet />} />
          <Route path="ratings"     element={<Ratings />} />
          <Route path="profile"     element={<ProfilePage />} />
          <Route path="messages"    element={<MessagesPage />} />
        </Route>

        {/* Admin Dashboard */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index              element={<AdminDashboard />} />
          <Route path="users"       element={<AdminUsers />} />
          <Route path="sessions"    element={<AdminSessions />} />
          <Route path="disputes"    element={<AdminDisputes />} />
          <Route path="analytics"   element={<AdminAnalytics />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SocketProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
