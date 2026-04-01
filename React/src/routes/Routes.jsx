import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";

// Actual components for our dashboard
import Sidebar from "../components/Sidebar";
import Dashboard from "../components/Dashboard";
import SiteManagement from "../components/SiteManagement";
import LaborersDirectory from "../components/LaborersDirectory";
import EngineeringStaff from "../components/EngineeringStaff";
import CreateSite from "../pages/sites/CreateSite";

const ProtectedLayout = () => {
  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />
      <main className="flex-1">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-800"></div>
    </div>
  );

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children || <Outlet />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children || <Outlet />;
};

function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>
        
        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<ProtectedLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="sites" element={<SiteManagement />} />
            <Route path="create-site" element={<CreateSite />} />
            <Route path="workers" element={<LaborersDirectory />} />
            <Route path="engineers" element={<EngineeringStaff />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default AppRoutes;