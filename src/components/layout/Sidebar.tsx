import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Tractor, BookOpen, ShoppingCart,
  Bell, Users, TrendingUp, FileCheck, BarChart3, Settings,
  Store, Package, Star, UserCheck, AlertCircle, Database,
  Banknote, LogOut, ChevronLeft, ChevronRight, ClipboardList, MapPin
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import type { UserRole } from '../../types';
import { useState } from 'react';
import './Sidebar.css';

const NAV_CONFIG: Record<UserRole, { label: string; icon: React.ElementType; path: string }[]> = {
  farmer: [
    { label: 'Dashboard',       icon: LayoutDashboard, path: '/farmer' },
    { label: 'Credit Apply',    icon: FileText,        path: '/farmer/credit' },
    { label: 'My Contracts',    icon: FileCheck,       path: '/farmer/contracts' },
    { label: 'Farm Manager',    icon: Tractor,         path: '/farmer/farm' },
    { label: 'Repayments',      icon: TrendingUp,      path: '/farmer/repayments' },
    { label: 'Training',        icon: BookOpen,        path: '/farmer/training' },
    { label: 'Marketplace',     icon: ShoppingCart,    path: '/farmer/marketplace' },
    { label: 'Notifications',   icon: Bell,            path: '/farmer/notifications' },
  ],
  investor: [
    { label: 'Dashboard',         icon: LayoutDashboard, path: '/investor' },
    { label: 'Opportunities',     icon: Star,            path: '/investor/opportunities' },
    { label: 'Browse Farmers',    icon: Users,           path: '/investor/farmers' },
    { label: 'My Portfolio',      icon: TrendingUp,      path: '/investor/portfolio' },
    { label: 'Contracts',         icon: FileCheck,       path: '/investor/contracts' },
    { label: 'Due Diligence',     icon: FileText,        path: '/investor/diligence' },
    { label: 'Impact Reports',    icon: BarChart3,       path: '/investor/impact' },
    { label: 'Notifications',     icon: Bell,            path: '/investor/notifications' },
  ],
  admin: [
    { label: 'Overview',        icon: LayoutDashboard, path: '/admin' },
    { label: 'Users',           icon: Users,           path: '/admin/users' },
    { label: 'Farm Registry',   icon: Tractor,         path: '/admin/farms' },
    { label: 'Credit Workflow', icon: FileCheck,       path: '/admin/credit' },
    { label: 'Farmer Matching', icon: UserCheck,       path: '/admin/matching' },
    { label: 'Training CMS',    icon: BookOpen,        path: '/admin/training' },
    { label: 'Disputes',        icon: AlertCircle,     path: '/admin/disputes' },
    { label: 'Disbursements',   icon: Banknote,        path: '/admin/disbursements' },
    { label: 'Analytics',       icon: BarChart3,       path: '/admin/analytics' },
    { label: 'Audit Logs',      icon: Database,        path: '/admin/audit' },
    { label: 'Settings',        icon: Settings,        path: '/admin/settings' },
  ],
  monitoring_officer: [
    { label: 'Dashboard',       icon: LayoutDashboard, path: '/monitoring' },
    { label: 'Submit Report',   icon: ClipboardList,   path: '/monitoring/report' },
    { label: 'All Farms',       icon: MapPin,          path: '/monitoring/farms' },
    { label: 'Notifications',   icon: Bell,            path: '/monitoring/notifications' },
  ],
  consumer: [
    { label: 'Marketplace',     icon: Store,           path: '/consumer' },
    { label: 'My Orders',       icon: Package,         path: '/consumer/orders' },
    { label: 'Subscriptions',   icon: Star,            path: '/consumer/subscriptions' },
    { label: 'Notifications',   icon: Bell,            path: '/consumer/notifications' },
  ],
};

const ROLE_COLORS: Record<UserRole, string> = {
  farmer:             '#4A7C2F',
  investor:           '#1A4A6B',
  admin:              '#5C2D8B',
  monitoring_officer: '#1A6B5A',
  consumer:           '#8B3A2F',
};

const ROLE_LABELS: Record<UserRole, string> = {
  farmer:             'Farmer Portal',
  investor:           'Investor Portal',
  admin:              'Admin Panel',
  monitoring_officer: 'Monitoring Officer',
  consumer:           'Marketplace',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const navItems  = NAV_CONFIG[user.role];
  const roleColor = ROLE_COLORS[user.role];

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`} style={{ '--role-color': roleColor } as React.CSSProperties}>
      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-mark">
          <span>F</span>
        </div>
        {!collapsed && (
          <div className="sidebar__logo-text">
            <span className="sidebar__logo-name">FarmAsyst</span>
            <span className="sidebar__logo-sub">North</span>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="sidebar__role-badge">
          {ROLE_LABELS[user.role]}
        </div>
      )}

      {/* Nav */}
      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path.split('/').length === 2}
            className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={18} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar__footer">
        {!collapsed && (
          <div className="sidebar__user">
            <div className="sidebar__avatar">{(user.full_name ?? user.first_name ?? '?').charAt(0).toUpperCase()}</div>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user.full_name ?? `${user.first_name} ${user.last_name}`}</span>
              <span className="sidebar__user-email">{user.email}</span>
            </div>
          </div>
        )}
        <button className="sidebar__logout" onClick={logout} title="Sign out">
          <LogOut size={16} />
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        className="sidebar__collapse-btn"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
