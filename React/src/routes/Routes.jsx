import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import LoginPage from "../pages/auth/LoginPage";

// Actual components for our dashboard
import Sidebar from "../components/Sidebar";
import Dashboard from "../components/Dashboard";
import SiteManagement from "../components/SiteManagement";
import Workers from "../pages/workers/Workers.jsx";
import EngineeringStaff from "../components/EngineeringStaff";
import CreateSite from "../pages/sites/CreateSite";
import CreateManager from "../pages/admin/CreateManager.jsx";

import Attendance from "../pages/attendance/Attendance.jsx";
import Payments from "../pages/payments/Payments.jsx";
import Inventory from "../pages/inventory/Inventory.jsx";
import Invoices from "../pages/invoices/Invoices.jsx";

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

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (isAuthenticated) return <Navigate to="/" replace />;
  
  return children;
};

function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          } 
        />
        
        {/* Protected Dashboard Routes */}
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <ProtectedLayout />
            </PrivateRoute>
          } 
        >
          <Route index element={<Dashboard />} />
          <Route path="sites" element={<SiteManagement />} />
          <Route path="create-site" element={<CreateSite />} />
          <Route path="workers" element={<Workers />} />
          <Route path="engineers" element={<EngineeringStaff />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="payments" element={<Payments />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="create-manager" element={<CreateManager />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default AppRoutes;