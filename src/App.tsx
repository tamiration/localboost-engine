import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LandingPage from "@/pages/LandingPage";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import WaitingForAccess from "@/pages/WaitingForAccess";
import AdminLayout from "@/layouts/AdminLayout";
import ClientLayout from "@/layouts/ClientLayout";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminClients from "@/pages/admin/Clients";
import AdminLandingPages from "@/pages/admin/LandingPages";
import AdminTemplates from "@/pages/admin/Templates";
import AdminAnalytics from "@/pages/admin/Analytics";
import AdminEditRequests from "@/pages/admin/EditRequests";
import AdminSettings from "@/pages/admin/AdminSettings";
import UserManagement from "@/pages/admin/UserManagement";
import ClientOverview from "@/pages/client/ClientOverview";
import MyLandingPages from "@/pages/client/MyLandingPages";
import ClientAnalytics from "@/pages/client/ClientAnalytics";
import ClientEditRequests from "@/pages/client/ClientEditRequests";
import DnsSetup from "@/pages/client/DnsSetup";
import Billing from "@/pages/client/Billing";
import NotFound from "@/pages/NotFound";
import Onboarding from "@/pages/Onboarding";
import Index from "@/pages/Index";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/waiting" element={<WaitingForAccess />} />

            <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="clients" element={<AdminClients />} />
              <Route path="clients/:clientId" element={<AdminClients />} />
              <Route path="landing-pages" element={<AdminLandingPages />} />
              <Route path="landing-pages/:pageId" element={<AdminLandingPages />} />
              <Route path="templates" element={<AdminTemplates />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="edit-requests" element={<AdminEditRequests />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="users" element={<UserManagement />} />
            </Route>

            <Route path="/client" element={<ProtectedRoute allowedRole="client"><ClientLayout /></ProtectedRoute>}>
              <Route index element={<ClientOverview />} />
              <Route path="pages" element={<MyLandingPages />} />
              <Route path="analytics" element={<ClientAnalytics />} />
              <Route path="edit-requests" element={<ClientEditRequests />} />
              <Route path="dns" element={<DnsSetup />} />
              <Route path="dns-setup" element={<DnsSetup />} />
              <Route path="billing" element={<Billing />} />
            </Route>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/p/:subdomain" element={<LandingPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
