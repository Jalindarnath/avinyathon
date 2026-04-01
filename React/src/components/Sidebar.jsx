import { LayoutDashboard, Building2, Users, HardHat, CalendarCheck, CreditCard, Package, FileText, BarChart3, Settings, LifeBuoy, Plus, LogOut, User as UserIcon } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSite } from '../context/SiteContext';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { selectedSite, setSelectedSite, sites } = useSite();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Building2, label: 'Sites', path: '/sites' },
    { icon: Users, label: 'Workers', path: '/workers' },
    { icon: HardHat, label: 'Engineers', path: '/engineers' },
    { icon: CalendarCheck, label: 'Attendance', path: '/attendance' },
    { icon: CreditCard, label: 'Payments', path: '/payments' },
    { icon: Package, label: 'Inventory', path: '/inventory' },
    { icon: FileText, label: 'Invoices', path: '/invoices' },
    { icon: BarChart3, label: 'Reports', path: '/reports' },
  ];

  const handleCreateSiteNavigate = () => {
    navigate('/create-site');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col p-4 fixed left-0 top-0 z-50">
      {/* Logo Section */}
      <div className="flex items-center gap-2 mb-6 px-2">
        <div className="bg-orange-800 p-2 rounded-xl text-white shadow-lg shadow-orange-100">
          <Building2 size={24} />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight text-slate-900">Samarth</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Developers</p>
        </div>
      </div>

      {/* Global Site Selector */}
      {sites.length > 0 && (
        <div className="mb-6 px-2">
          <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1.5 block">Active Project</label>
          <select 
            className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl p-2.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none cursor-pointer"
            value={selectedSite?.$id || ''}
            onChange={(e) => {
              const site = sites.find(s => s.$id === e.target.value);
              setSelectedSite(site);
            }}
          >
            {sites.map(site => (
              <option key={site.$id} value={site.$id}>
                {site.siteName || site.name || 'Unnamed Site'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide mb-4">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) => 
              `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                isActive 
                  ? 'bg-orange-50 text-orange-800 shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`
            }
          >
            <item.icon size={18} className={({ isActive }) => isActive ? 'text-orange-700' : ''} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="pt-4 border-t border-gray-100 space-y-3">
        <button 
          onClick={handleCreateSiteNavigate}
          className="w-full bg-orange-800 text-white flex items-center justify-center gap-2 py-3 rounded-xl shadow-lg shadow-orange-950/10 font-bold hover:bg-orange-900 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus size={20} /> New Site
        </button>

        {/* User Profile Area */}
        <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-orange-800 shadow-sm">
            <UserIcon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'User'}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{user?.role || 'Guest'}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}