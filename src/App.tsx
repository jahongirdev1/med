import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { storage } from "@/utils/storage";
import Layout from "@/components/Layout";

// Auth
import Login from "@/pages/Login";

// Admin pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import Branches from "@/pages/admin/Branches";
import Medicines from "@/pages/admin/Medicines";
import MedicalDevices from "@/pages/admin/MedicalDevices";
import Categories from "@/pages/admin/Categories";
import Shipments from "@/pages/admin/Shipments";
import Reports from "@/pages/admin/Reports";
import AdminEmployees from "@/pages/admin/AdminEmployees";
import AdminReports from "@/pages/admin/AdminReports";
import AdminPatients from "@/pages/admin/AdminPatients";
import TransferMedicines from "@/pages/admin/TransferMedicines";
import AdminArrivals from "@/pages/admin/Arrivals";
import AdminProfile from "@/pages/admin/Profile";
import AdminCalendar from "@/pages/admin/Calendar";
import Analytics from "@/pages/admin/Analytics";
import MedicalDevicesCategories from "@/pages/admin/MedicalDevicesCategories";
import MedicineCategories from "@/pages/admin/MedicineCategories";

// Branch pages
import BranchDashboard from "@/pages/branch/BranchDashboard";
import Arrivals from "@/pages/branch/Arrivals";
import BranchPatients from "@/pages/branch/BranchPatients";
import BranchEmployees from "@/pages/branch/BranchEmployees";
import Dispensing from "@/pages/branch/Dispensing";
import BranchReports from "@/pages/branch/BranchReports";
import BranchCalendar from "@/pages/branch/Calendar";
import BranchMedicalDevices from "@/pages/branch/MedicalDevices";
import BranchMedicines from "@/pages/branch/Medicines";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode, requiredRole?: string }) => {
  const currentUser = storage.getCurrentUser();
  
  if (!currentUser || !storage.isSessionValid()) {
    return <Navigate to="/" replace />;
  }
  
  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

const App = () => {
  const currentUser = storage.getCurrentUser();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route 
              path="/" 
              element={
                currentUser && storage.isSessionValid() ? (
                  currentUser.role === 'admin' ? 
                    <Navigate to="/admin" replace /> : 
                    <Navigate to="/branch" replace />
                ) : (
                  <Login />
                )
              } 
            />
            
            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/branches" element={<ProtectedRoute requiredRole="admin"><Branches /></ProtectedRoute>} />
            <Route path="/admin/medicines" element={<ProtectedRoute requiredRole="admin"><Medicines /></ProtectedRoute>} />
            <Route path="/admin/medical-devices" element={<ProtectedRoute requiredRole="admin"><MedicalDevices /></ProtectedRoute>} />
            <Route path="/admin/categories" element={<ProtectedRoute requiredRole="admin"><Categories /></ProtectedRoute>} />
            <Route path="/admin/medicine-categories" element={<ProtectedRoute requiredRole="admin"><MedicineCategories /></ProtectedRoute>} />
            <Route path="/admin/medical-devices-categories" element={<ProtectedRoute requiredRole="admin"><MedicalDevicesCategories /></ProtectedRoute>} />
            <Route path="/admin/shipments" element={<ProtectedRoute requiredRole="admin"><Shipments /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute requiredRole="admin"><Reports /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute requiredRole="admin"><Analytics /></ProtectedRoute>} />
            <Route path="/admin/calendar" element={<ProtectedRoute requiredRole="admin"><AdminCalendar /></ProtectedRoute>} />
            <Route path="/admin/arrivals" element={<ProtectedRoute requiredRole="admin"><AdminArrivals /></ProtectedRoute>} />
            <Route path="/admin/employees" element={<ProtectedRoute requiredRole="admin"><AdminEmployees /></ProtectedRoute>} />
            <Route path="/admin/admin-reports" element={<ProtectedRoute requiredRole="admin"><AdminReports /></ProtectedRoute>} />
            <Route path="/admin/patients" element={<ProtectedRoute requiredRole="admin"><AdminPatients /></ProtectedRoute>} />
            <Route path="/admin/transfer-medicines" element={<ProtectedRoute requiredRole="admin"><TransferMedicines /></ProtectedRoute>} />
            <Route path="/admin/transfer/:branchId" element={<ProtectedRoute requiredRole="admin"><TransferMedicines /></ProtectedRoute>} />
            <Route path="/admin/profile" element={<ProtectedRoute requiredRole="admin"><AdminProfile /></ProtectedRoute>} />
            
            {/* Branch routes */}
            <Route path="/branch" element={<ProtectedRoute requiredRole="branch"><BranchDashboard /></ProtectedRoute>} />
            <Route path="/branch/arrivals" element={<ProtectedRoute requiredRole="branch"><Arrivals /></ProtectedRoute>} />
            <Route path="/branch/patients" element={<ProtectedRoute requiredRole="branch"><BranchPatients /></ProtectedRoute>} />
            <Route path="/branch/employees" element={<ProtectedRoute requiredRole="branch"><BranchEmployees /></ProtectedRoute>} />
            <Route path="/branch/dispensing" element={<ProtectedRoute requiredRole="branch"><Dispensing /></ProtectedRoute>} />
            <Route path="/branch/reports" element={<ProtectedRoute requiredRole="branch"><BranchReports /></ProtectedRoute>} />
            <Route path="/branch/calendar" element={<ProtectedRoute requiredRole="branch"><BranchCalendar /></ProtectedRoute>} />
            <Route path="/branch/medical-devices" element={<ProtectedRoute requiredRole="branch"><BranchMedicalDevices /></ProtectedRoute>} />
            <Route path="/branch/medicines" element={<ProtectedRoute requiredRole="branch"><BranchMedicines /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
