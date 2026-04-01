import { Building2, Users, Wallet, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import StatCard from './StatCard';
import { useSite } from '../context/SiteContext';

export default function Dashboard() {
  const { user } = useAuth();
  const { selectedSite, sites } = useSite();

  return (
    <div className="flex-1 ml-64 bg-slate-50 min-h-screen p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <div className="flex items-center gap-2 text-sm font-bold text-orange-800 bg-orange-50 px-4 py-2.5 rounded-2xl border border-orange-100 shadow-sm">
            <span className="text-orange-400 uppercase text-[10px] tracking-widest mr-2">Active Site:</span>
            <span className="truncate">{selectedSite ? (selectedSite.siteName || selectedSite.name || 'Unnamed Site') : 'No Site Selected'}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 border-l pl-6 border-gray-200">
            <div className="text-right">
              <p className="text-sm font-black text-slate-900">{user?.name || 'Manager'}</p>
              <p className="text-[10px] text-orange-600 uppercase font-black tracking-tighter">{user?.role || 'User'}</p>
            </div>
            <div className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 shadow-sm bg-white font-bold text-orange-800">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mb-10">
        <h2 className="text-5xl font-black text-slate-900 mb-3 tracking-tight">Executive Summary</h2>
        <p className="text-slate-500 max-w-xl leading-relaxed font-medium">
          Real-time overview of your construction sites, financial health, and workforce allocation for the current quarter.
        </p>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard title="Total Sites" value={sites.length.toString()} subtitle="assigned to you" icon={Building2} colorClass="bg-blue-50" />
        <StatCard title="Total Workers" value="120" subtitle="Active Now" icon={Users} colorClass="bg-orange-50" />
        <StatCard title="Total Expenses" value="$45,200" subtitle="Updated recently" trend="+12%" icon={Wallet} colorClass="bg-emerald-50" />
        <StatCard title="Pending Payments" value="$8,500" badge="Urgent" icon={CreditCard} colorClass="bg-red-50" />
      </div>

      {/* Bottom Section: Progress & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h4 className="font-black text-slate-900 text-lg mb-6">Expense Breakdown</h4>
          <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl mb-8 bg-slate-50/50">
             <BarChart3 className="text-slate-200 mb-2" size={32} />
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chart Visualization</p>
          </div>
          <div className="space-y-5">
            <div className="flex justify-between items-center p-3 rounded-2xl bg-orange-50/30 border border-orange-50">
              <span className="flex items-center gap-3 text-sm text-slate-700 font-bold">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-800 shadow-sm"></div> Direct Labor
              </span>
              <span className="font-black text-slate-900">$29,380</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-2xl bg-blue-50/30 border border-blue-50">
              <span className="flex items-center gap-3 text-sm text-slate-700 font-bold">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm"></div> Materials
              </span>
              <span className="font-black text-slate-900">$12,420</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">Recent Activity</h4>
            <button className="text-orange-800 text-[11px] font-black uppercase tracking-widest hover:text-orange-950 transition-colors bg-white border border-slate-100 px-4 py-2 rounded-xl shadow-sm">View History</button>
          </div>
          {/* Activity List */}
          <div className="space-y-6">
            {[
              { ref: 'Concrete Supplies Ltd', cat: 'Inventory', date: 'Oct 24, 2023', amt: '$3,240.00', color: 'bg-indigo-50 text-indigo-600' },
              { ref: 'Weekly Wages - Site A', cat: 'Labor', date: 'Oct 22, 2023', amt: '$12,850.00', color: 'bg-orange-50 text-orange-600' },
              { ref: 'Global Heavy Mach.', cat: 'Equipment', date: 'Oct 20, 2023', amt: '$1,100.00', color: 'bg-emerald-50 text-emerald-600' },
            ].map((row, i) => (
              <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-5 last:border-0 last:pb-0 hover:bg-slate-50/50 transition-colors p-2 -m-2 rounded-2xl">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm text-slate-400">
                      <Plus size={20} />
                   </div>
                   <div>
                     <p className="font-bold text-slate-900 text-sm">{row.ref}</p>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">REF-{882000 + i}</p>
                   </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                   <span className={`${row.color} px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider`}>{row.cat}</span>
                   <p className="text-slate-400 text-[11px] font-medium">{row.date}</p>
                </div>
                <span className="font-black text-slate-900 text-base">{row.amt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { BarChart3, Plus as PlusIcon } from 'lucide-react';