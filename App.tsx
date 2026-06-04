import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth-context';
import AppLayout from './components/layout/AppLayout';

import Login from './pages/auth/Login';

import FarmerDashboard     from './pages/farmer/Dashboard';
import CreditApplication   from './pages/farmer/CreditApplication';
import FarmerContracts     from './pages/farmer/Contracts';
import FarmManager         from './pages/farmer/FarmManager';
import Repayments          from './pages/farmer/Repayments';
import Training            from './pages/farmer/Training';
import FarmerMarketplace   from './pages/farmer/Marketplace';
import FarmerNotifications from './pages/farmer/Notifications';

import InvestorDashboard     from './pages/investor/Dashboard';
import BrowseFarmers         from './pages/investor/Farmers';
import FarmerProfilePage     from './pages/investor/FarmerProfile';
import Opportunities         from './pages/investor/Opportunities';
import Portfolio             from './pages/investor/Portfolio';
import Contracts             from './pages/investor/Contracts';
import DueDiligence          from './pages/investor/Diligence';
import ImpactReports         from './pages/investor/Impact';
import InvestorNotifications from './pages/investor/Notifications';

import AdminDashboard  from './pages/admin/Dashboard';
import AdminUsers      from './pages/admin/Users';
import AdminFarms      from './pages/admin/Farms';
import AdminCredit     from './pages/admin/CreditWorkflow';
import AdminMatching   from './pages/admin/Matching';
import AdminTraining   from './pages/admin/Training';
import AdminDisputes       from './pages/admin/Disputes';
import AdminDisbursements  from './pages/admin/Disbursements';
import AdminAnalytics      from './pages/admin/Analytics';
import AdminAudit      from './pages/admin/Audit';
import AdminSettings   from './pages/admin/Settings';

import ConsumerMarketplace   from './pages/consumer/Marketplace';
import Orders                from './pages/consumer/Orders';
import Subscriptions         from './pages/consumer/Subscriptions';
import ConsumerNotifications from './pages/consumer/Notifications';

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:14, color:'#888' }}>
      Loading FarmAsyst North…
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={`/${user.role}`} replace /> : <Login />} />

      <Route element={<ProtectedRoutes />}>
        <Route path="/farmer"                 element={<FarmerDashboard />} />
        <Route path="/farmer/credit"          element={<CreditApplication />} />
        <Route path="/farmer/contracts"       element={<FarmerContracts />} />
        <Route path="/farmer/farm"            element={<FarmManager />} />
        <Route path="/farmer/repayments"      element={<Repayments />} />
        <Route path="/farmer/training"        element={<Training />} />
        <Route path="/farmer/marketplace"     element={<FarmerMarketplace />} />
        <Route path="/farmer/notifications"   element={<FarmerNotifications />} />

        <Route path="/investor"                  element={<InvestorDashboard />} />
        <Route path="/investor/opportunities"    element={<Opportunities />} />
        <Route path="/investor/farmers"          element={<BrowseFarmers />} />
        <Route path="/investor/farmers/:id"      element={<FarmerProfilePage />} />
        <Route path="/investor/portfolio"     element={<Portfolio />} />
        <Route path="/investor/contracts"     element={<Contracts />} />
        <Route path="/investor/diligence"     element={<DueDiligence />} />
        <Route path="/investor/impact"        element={<ImpactReports />} />
        <Route path="/investor/notifications" element={<InvestorNotifications />} />

        <Route path="/admin"                  element={<AdminDashboard />} />
        <Route path="/admin/users"            element={<AdminUsers />} />
        <Route path="/admin/farms"            element={<AdminFarms />} />
        <Route path="/admin/credit"           element={<AdminCredit />} />
        <Route path="/admin/matching"         element={<AdminMatching />} />
        <Route path="/admin/training"         element={<AdminTraining />} />
        <Route path="/admin/disputes"         element={<AdminDisputes />} />
        <Route path="/admin/disbursements"    element={<AdminDisbursements />} />
        <Route path="/admin/analytics"        element={<AdminAnalytics />} />
        <Route path="/admin/audit"            element={<AdminAudit />} />
        <Route path="/admin/settings"         element={<AdminSettings />} />

        <Route path="/consumer"               element={<ConsumerMarketplace />} />
        <Route path="/consumer/orders"        element={<Orders />} />
        <Route path="/consumer/subscriptions" element={<Subscriptions />} />
        <Route path="/consumer/notifications" element={<ConsumerNotifications />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}