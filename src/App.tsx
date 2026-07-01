import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth-context';
import { useAuth } from './lib/hooks/useAuth';
import AppLayout from './components/layout/AppLayout';

import Login from './pages/auth/Login';
import ProfilePage from './pages/shared/ProfilePage';

import FarmerDashboard     from './pages/farmer/Dashboard';
import CreditApplication   from './pages/farmer/CreditApplication';
import FarmManager         from './pages/farmer/FarmManager';
import Repayments          from './pages/farmer/Repayments';
import Training            from './pages/farmer/Training';
import FarmerMarketplace   from './pages/farmer/Marketplace';
import FarmerNotifications from './pages/farmer/Notifications';
import FarmerContracts     from './pages/farmer/Contracts';
import FarmerVetServices   from './pages/farmer/VetServices';
import FarmerFarmInputs    from './pages/farmer/FarmInputs';

import MonitoringDashboard     from './pages/monitoring/Dashboard';
import MonitoringFarms         from './pages/monitoring/Farms';
import MonitoringNotifications from './pages/monitoring/Notifications';
import MonitoringFarmersList   from './pages/monitoring/FarmersList';
import SubmitReport            from './pages/monitoring/SubmitReport';

import InvestorDashboard     from './pages/investor/Dashboard';
import BrowseFarmers         from './pages/investor/Farmers';
import Portfolio             from './pages/investor/Portfolio';
import Contracts             from './pages/investor/Contracts';
import Opportunities         from './pages/investor/Opportunities';
import DueDiligence          from './pages/investor/Diligence';
import ImpactReports         from './pages/investor/Impact';
import InvestorNotifications from './pages/investor/Notifications';

import AdminDashboard              from './pages/admin/Dashboard';
import AdminFarms                  from './pages/admin/Farms';
import AdminUsers                  from './pages/admin/Users';
import AdminCredit                 from './pages/admin/CreditWorkflow';
import AdminMatching               from './pages/admin/Matching';
import AdminTraining               from './pages/admin/Training';
import AdminDisputes               from './pages/admin/Disputes';
import AdminDisbursements          from './pages/admin/Disbursements';
import AdminAnalytics              from './pages/admin/Analytics';
import AdminAudit                  from './pages/admin/Audit';
import AdminMonitoring             from './pages/admin/Monitoring';
import AdminSettings               from './pages/admin/Settings';
import AdminCreditAlerts           from './pages/admin/CreditAlerts';
import AdminNotifications          from './pages/admin/Notifications';
import AdminVetManagement          from './pages/admin/VetManagement';
import AdminInputDealerManagement  from './pages/admin/InputDealerManagement';

import ConsumerMarketplace   from './pages/consumer/Marketplace';
import Orders                from './pages/consumer/Orders';
import Subscriptions         from './pages/consumer/Subscriptions';
import ConsumerNotifications from './pages/consumer/Notifications';

import VetDashboard     from './pages/vet/Dashboard';
import VetBookings      from './pages/vet/Bookings';
import VetServices      from './pages/vet/Services';
import VetNotifications from './pages/vet/Notifications';

import InputDealerDashboard     from './pages/input_dealer/Dashboard';
import InputDealerListings      from './pages/input_dealer/Listings';
import InputDealerNotifications from './pages/input_dealer/Notifications';

import AIAssistant          from './pages/shared/AIAssistant';
import ProjectApplications  from './pages/investor/ProjectApplications';
import AdminProjects        from './pages/admin/Projects';

function ProtectedRoutes({ allowedRoles }: { allowedRoles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:14, color:'#888' }}>
      Loading FarmAsyst North…
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }
  return <AppLayout />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={`/${user.role}`} replace /> : <Login />} />

      {/* Farmer */}
      <Route element={<ProtectedRoutes allowedRoles={['farmer']} />}>
        <Route path="/farmer"               element={<FarmerDashboard />} />
        <Route path="/farmer/credit"        element={<CreditApplication />} />
        <Route path="/farmer/farm"          element={<FarmManager />} />
        <Route path="/farmer/repayments"    element={<Repayments />} />
        <Route path="/farmer/contracts"     element={<FarmerContracts />} />
        <Route path="/farmer/training"      element={<Training />} />
        <Route path="/farmer/marketplace"   element={<FarmerMarketplace />} />
        <Route path="/farmer/vet"           element={<FarmerVetServices />} />
        <Route path="/farmer/inputs"        element={<FarmerFarmInputs />} />
        <Route path="/farmer/ai"            element={<AIAssistant />} />
        <Route path="/farmer/notifications" element={<FarmerNotifications />} />
        <Route path="/farmer/profile" element={<ProfilePage />} />
      </Route>

      {/* Investor */}
      <Route element={<ProtectedRoutes allowedRoles={['investor']} />}>
        <Route path="/investor"                element={<InvestorDashboard />} />
        <Route path="/investor/opportunities"  element={<Opportunities />} />
        <Route path="/investor/projects"       element={<ProjectApplications />} />
        <Route path="/investor/farmers"        element={<BrowseFarmers />} />
        <Route path="/investor/portfolio"      element={<Portfolio />} />
        <Route path="/investor/contracts"      element={<Contracts />} />
        <Route path="/investor/diligence"      element={<DueDiligence />} />
        <Route path="/investor/impact"         element={<ImpactReports />} />
        <Route path="/investor/ai"             element={<AIAssistant />} />
        <Route path="/investor/notifications"  element={<InvestorNotifications />} />
        <Route path="/investor/profile" element={<ProfilePage />} />
      </Route>

      {/* Admin */}
      <Route element={<ProtectedRoutes allowedRoles={['admin']} />}>
        <Route path="/admin"                   element={<AdminDashboard />} />
        <Route path="/admin/farms"             element={<AdminFarms />} />
        <Route path="/admin/users"             element={<AdminUsers />} />
        <Route path="/admin/credit"            element={<AdminCredit />} />
        <Route path="/admin/projects"          element={<AdminProjects />} />
        <Route path="/admin/credit-alerts"     element={<AdminCreditAlerts />} />
        <Route path="/admin/notifications"     element={<AdminNotifications />} />
        <Route path="/admin/matching"          element={<AdminMatching />} />
        <Route path="/admin/training"          element={<AdminTraining />} />
        <Route path="/admin/disputes"          element={<AdminDisputes />} />
        <Route path="/admin/disbursements"     element={<AdminDisbursements />} />
        <Route path="/admin/analytics"         element={<AdminAnalytics />} />
        <Route path="/admin/audit"             element={<AdminAudit />} />
        <Route path="/admin/monitoring"        element={<AdminMonitoring />} />
        <Route path="/admin/vets"              element={<AdminVetManagement />} />
        <Route path="/admin/input-dealers"     element={<AdminInputDealerManagement />} />
        <Route path="/admin/ai"                element={<AIAssistant />} />
        <Route path="/admin/settings"          element={<AdminSettings />} />
        <Route path="/admin/profile"           element={<ProfilePage />} />
      </Route>

      {/* Consumer */}
      <Route element={<ProtectedRoutes allowedRoles={['consumer']} />}>
        <Route path="/consumer"               element={<ConsumerMarketplace />} />
        <Route path="/consumer/orders"        element={<Orders />} />
        <Route path="/consumer/subscriptions" element={<Subscriptions />} />
        <Route path="/consumer/ai"            element={<AIAssistant />} />
        <Route path="/consumer/notifications" element={<ConsumerNotifications />} />
        <Route path="/consumer/profile" element={<ProfilePage />} />
      </Route>

      {/* Monitoring Officer */}
      <Route element={<ProtectedRoutes allowedRoles={['monitoring_officer']} />}>
        <Route path="/monitoring_officer"                element={<MonitoringDashboard />} />
        <Route path="/monitoring_officer/farms"          element={<MonitoringFarms />} />
        <Route path="/monitoring_officer/report"         element={<SubmitReport />} />
        <Route path="/monitoring_officer/farmers"        element={<MonitoringFarmersList />} />
        <Route path="/monitoring_officer/ai"             element={<AIAssistant />} />
        <Route path="/monitoring_officer/notifications"  element={<MonitoringNotifications />} />
        <Route path="/monitoring_officer/profile" element={<ProfilePage />} />
      </Route>

      {/* Vet */}
      <Route element={<ProtectedRoutes allowedRoles={['vet']} />}>
        <Route path="/vet"                element={<VetDashboard />} />
        <Route path="/vet/bookings"       element={<VetBookings />} />
        <Route path="/vet/services"       element={<VetServices />} />
        <Route path="/vet/ai"             element={<AIAssistant />} />
        <Route path="/vet/notifications"  element={<VetNotifications />} />
        <Route path="/vet/profile" element={<ProfilePage />} />
      </Route>

      {/* Input Dealer */}
      <Route element={<ProtectedRoutes allowedRoles={['input_dealer']} />}>
        <Route path="/input_dealer"                element={<InputDealerDashboard />} />
        <Route path="/input_dealer/listings"       element={<InputDealerListings />} />
        <Route path="/input_dealer/ai"             element={<AIAssistant />} />
        <Route path="/input_dealer/notifications"  element={<InputDealerNotifications />} />
        <Route path="/input_dealer/profile" element={<ProfilePage />} />
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
