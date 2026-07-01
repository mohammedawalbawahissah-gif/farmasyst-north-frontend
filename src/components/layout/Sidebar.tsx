import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Tractor, BookOpen, ShoppingCart,
  Bell, Users, TrendingUp, FileCheck, BarChart3, Settings,
  Store, Package, Star, UserCheck, AlertCircle, Database,
  Banknote, LogOut, ChevronLeft, ChevronRight, ClipboardList,
  MapPin, ShieldCheck, Stethoscope, Calendar, Pill, AlertTriangle,
  Menu, X, UserCircle, FolderKanban, Sparkles,
} from 'lucide-react';
import { useAuth } from '../../lib/hooks/useAuth';
import FarmAsystLogo, { FarmAsystLogoFull } from '../ui/FarmAsystLogo';
import NotificationBell from '../notifications/NotificationBell';
import type { UserRole } from '../../types';
import { useState, useEffect } from 'react';
import './Sidebar.css';

const NAV_CONFIG: Record<UserRole, { label: string; icon: React.ElementType; path: string }[]> = {
  farmer: [
    { label: 'Dashboard',     icon: LayoutDashboard, path: '/farmer' },
    { label: 'Credit Apply',  icon: FileText,        path: '/farmer/credit' },
    { label: 'My Contracts',  icon: FileCheck,       path: '/farmer/contracts' },
    { label: 'Farm Manager',  icon: Tractor,         path: '/farmer/farm' },
    { label: 'Repayments',    icon: TrendingUp,      path: '/farmer/repayments' },
    { label: 'Training',      icon: BookOpen,        path: '/farmer/training' },
    { label: 'Marketplace',   icon: ShoppingCart,    path: '/farmer/marketplace' },
    { label: 'Vet Services',  icon: Stethoscope,     path: '/farmer/vet' },
    { label: 'Farm Inputs',   icon: Pill,            path: '/farmer/inputs' },
    { label: 'AI Assistant',  icon: Sparkles,             path: '/farmer/ai' },
    { label: 'Notifications', icon: Bell,            path: '/farmer/notifications' },
    { label: 'My Profile',    icon: UserCircle,      path: '/farmer/profile' },
  ],
  investor: [
    { label: 'Dashboard',           icon: LayoutDashboard, path: '/investor' },
    { label: 'Opportunities',       icon: Star,            path: '/investor/opportunities' },
    { label: 'Project Applications',icon: FolderKanban,    path: '/investor/projects' },
    { label: 'Browse Farmers',      icon: Users,           path: '/investor/farmers' },
    { label: 'My Portfolio',        icon: TrendingUp,      path: '/investor/portfolio' },
    { label: 'Contracts',           icon: FileCheck,       path: '/investor/contracts' },
    { label: 'Due Diligence',       icon: FileText,        path: '/investor/diligence' },
    { label: 'Impact Reports',      icon: BarChart3,       path: '/investor/impact' },
    { label: 'AI Assistant',        icon: Sparkles,             path: '/investor/ai' },
    { label: 'Notifications',       icon: Bell,            path: '/investor/notifications' },
    { label: 'My Profile',          icon: UserCircle,      path: '/investor/profile' },
  ],
  admin: [
    { label: 'Overview',        icon: LayoutDashboard, path: '/admin' },
    { label: 'Users',           icon: Users,           path: '/admin/users' },
    { label: 'Farm Registry',   icon: Tractor,         path: '/admin/farms' },
    { label: 'Credit Workflow', icon: FileCheck,       path: '/admin/credit' },
    { label: 'Project Applications', icon: FolderKanban, path: '/admin/projects' },
    { label: 'Credit Alerts',   icon: AlertTriangle,   path: '/admin/credit-alerts' },
    { label: 'Farmer Matching', icon: UserCheck,       path: '/admin/matching' },
    { label: 'Training CMS',    icon: BookOpen,        path: '/admin/training' },
    { label: 'Disputes',        icon: AlertCircle,     path: '/admin/disputes' },
    { label: 'Disbursements',   icon: Banknote,        path: '/admin/disbursements' },
    { label: 'Analytics',       icon: BarChart3,       path: '/admin/analytics' },
    { label: 'Audit Logs',      icon: Database,        path: '/admin/audit' },
    { label: 'Monitoring',      icon: ShieldCheck,     path: '/admin/monitoring' },
    { label: 'Vet Services',    icon: Stethoscope,     path: '/admin/vets' },
    { label: 'Input Dealers',   icon: Store,           path: '/admin/input-dealers' },
    { label: 'AI Assistant',    icon: Sparkles,             path: '/admin/ai' },
    { label: 'Settings',        icon: Settings,        path: '/admin/settings' },
    { label: 'My Profile',      icon: UserCircle,      path: '/admin/profile' },
  ],
  monitoring_officer: [
    { label: 'Dashboard',     icon: LayoutDashboard, path: '/monitoring_officer' },
    { label: 'Submit Report', icon: ClipboardList,   path: '/monitoring_officer/report' },
    { label: 'Farms',         icon: MapPin,          path: '/monitoring_officer/farms' },
    { label: 'Farmers',       icon: Users,           path: '/monitoring_officer/farmers' },
    { label: 'AI Assistant',  icon: Sparkles,             path: '/monitoring_officer/ai' },
    { label: 'Notifications', icon: Bell,            path: '/monitoring_officer/notifications' },
    { label: 'My Profile',    icon: UserCircle,      path: '/monitoring_officer/profile' },
  ],
  consumer: [
    { label: 'Marketplace',   icon: Store,      path: '/consumer' },
    { label: 'My Orders',     icon: Package,    path: '/consumer/orders' },
    { label: 'Subscriptions', icon: Star,       path: '/consumer/subscriptions' },
    { label: 'AI Assistant',  icon: Sparkles,        path: '/consumer/ai' },
    { label: 'Notifications', icon: Bell,       path: '/consumer/notifications' },
    { label: 'My Profile',    icon: UserCircle, path: '/consumer/profile' },
  ],
  vet: [
    { label: 'Dashboard',     icon: LayoutDashboard, path: '/vet' },
    { label: 'Bookings',      icon: Calendar,        path: '/vet/bookings' },
    { label: 'My Services',   icon: Stethoscope,     path: '/vet/services' },
    { label: 'AI Assistant',  icon: Sparkles,             path: '/vet/ai' },
    { label: 'Notifications', icon: Bell,            path: '/vet/notifications' },
    { label: 'My Profile',    icon: UserCircle,      path: '/vet/profile' },
  ],
  input_dealer: [
    { label: 'Dashboard',     icon: LayoutDashboard, path: '/input_dealer' },
    { label: 'My Listings',   icon: Package,         path: '/input_dealer/listings' },
    { label: 'AI Assistant',  icon: Sparkles,             path: '/input_dealer/ai' },
    { label: 'Notifications', icon: Bell,            path: '/input_dealer/notifications' },
    { label: 'My Profile',    icon: UserCircle,      path: '/input_dealer/profile' },
  ],
};

const ROLE_COLORS: Record<UserRole, string> = {
  farmer:             '#4A7C2F',
  investor:           '#1A4A6B',
  admin:              '#3730A3',
  monitoring_officer: '#1A6B5A',
  consumer:           '#8B3A2F',
  vet:                '#0D6E8E',
  input_dealer:       '#B45309',
};

const ROLE_LABELS: Record<UserRole, string> = {
  farmer:             'Farmer Portal',
  investor:           'Investor Portal',
  admin:              'Admin Panel',
  monitoring_officer: 'Monitoring Officer',
  consumer:           'Marketplace',
  vet:                'Vet Portal',
  input_dealer:       'Input Dealer',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change (when a link is tapped)
  const handleNavClick = () => setMobileOpen(false);

  // Close drawer on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  if (!user) return null;

  const navItems  = NAV_CONFIG[user.role] ?? [];
  const roleColor = ROLE_COLORS[user.role] ?? '#4A7C2F';

  const sidebarInner = (
    <aside
      className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${mobileOpen ? 'sidebar--mobile-open' : ''}`}
      style={{ '--role-color': roleColor } as React.CSSProperties}
    >
      <div className="sidebar__logo">
        {collapsed
          ? <FarmAsystLogo size={36} />
          : <FarmAsystLogoFull size={36} showText />
        }
        {/* Close button — mobile only */}
        <button className="sidebar__mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      {!collapsed && (
        <div className="sidebar__role-badge">{ROLE_LABELS[user.role] ?? user.role}</div>
      )}

      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path.split('/').length === 2}
            className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
            title={collapsed ? item.label : undefined}
            onClick={handleNavClick}
          >
            <item.icon size={18} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        {!collapsed && (
          <div className="sidebar__user">
            <div className="sidebar__avatar" style={{ overflow: 'hidden', position: 'relative' }}>
              {user.profile_photo
                ? <img src={user.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    onError={e => { e.currentTarget.style.display = 'none'; }} />
                : (user.full_name ?? user.first_name ?? '?').charAt(0).toUpperCase()
              }
            </div>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">
                {user.full_name ?? `${user.first_name} ${user.last_name}`}
              </span>
              <span className="sidebar__user-email">{user.email}</span>
            </div>
          </div>
        )}
        <button className="sidebar__logout" onClick={logout} title="Sign out">
          <LogOut size={16} />
        </button>
        <NotificationBell />
      </div>

      {/* Desktop collapse button */}
      <button
        className="sidebar__collapse-btn"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="mobile-topbar">
        <button className="mobile-topbar__hamburger" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu size={22} />
        </button>
        <div className="mobile-topbar__brand">
          <FarmAsystLogo size={30} />
          <span className="mobile-topbar__name">FarmAsyst North</span>
        </div>
        <div className="mobile-topbar__avatar" style={{ background: roleColor, overflow: 'hidden', position: 'relative' }}>
          {user.profile_photo
            ? <img src={user.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                onError={e => { e.currentTarget.style.display = 'none'; }} />
            : (user.full_name ?? user.first_name ?? '?').charAt(0).toUpperCase()
          }
        </div>
      </div>

      {/* ── Desktop sidebar (always visible ≥769px) ── */}
      <div className="sidebar-desktop">
        {sidebarInner}
      </div>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}
      <div className={`sidebar-drawer ${mobileOpen ? 'sidebar-drawer--open' : ''}`}>
        {sidebarInner}
      </div>
    </>
  );
}
