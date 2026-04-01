import { useState, useEffect } from 'react';
import { Building2, Plus, Compass, Trash2, Edit3, MapPin, User as UserIcon, Tag, Loader2, Search, Filter } from 'lucide-react';
import { updateSite, deleteSite } from '../../appwrite/services/site.service';
import { useSite } from '../context/SiteContext';
import { useAuth } from '../context/AuthContext';

export default function SiteManagement() {
  const { sites, fetchSites } = useSite();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [editingSite, setEditingSite] = useState(null);
  const [editFormData, setEditFormData] = useState({
    siteName: '',
    location: '',
    manager: '',
    status: 'ACTIVE'
  });
  const [updateLoading, setUpdateLoading] = useState(false);

  const handleEditClick = (site) => {
    setEditingSite(site);
    setEditFormData({
      siteName: site.siteName || site.name || '',
      location: site.location || site.loc || '',
      manager: site.manager || '',
      status: site.status || 'ACTIVE'
    });
  };

  const handleDeleteClick = async (site) => {
    if (window.confirm(`Are you sure you want to delete ${site.siteName || site.name}?`)) {
      try {
        await deleteSite(site.$id);
        await fetchSites(); // Refresh context
      } catch (error) {
        console.error("Error deleting site:", error);
        alert("Failed to delete the site. Please try again.");
      }
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    try {
      await updateSite(editingSite.$id, {
        siteName: editFormData.siteName,
        location: editFormData.location,
        manager: editFormData.manager,
        status: editFormData.status
      });
      await fetchSites();
      setEditingSite(null);
    } catch (error) {
      console.error("Error updating site:", error);
    } finally {
      setUpdateLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await fetchSites();
      setLoading(false);
    }
    initialize();
  }, [fetchSites]);

  const filteredSites = sites.filter(site => 
    (site.siteName || site.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (site.location || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 ml-64 bg-slate-50 min-h-screen p-8 font-sans">
      <div className="flex justify-between items-end mb-10 pb-8 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></div>
            <p className="text-orange-900 text-[10px] font-black uppercase tracking-[0.2em]">Infrastructure Hub</p>
          </div>
          <h2 className="text-5xl font-black text-slate-900 tracking-tight">Site Management</h2>
          <p className="text-slate-500 mt-2 font-medium">Control projects, monitor status, and manage site assignments.</p>
        </div>
        
        <div className="flex items-center gap-4">
             <div className="relative group">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-600 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search projects..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl w-80 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all shadow-sm"
                />
             </div>
             <button className="p-3.5 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-orange-800 hover:border-orange-200 transition-all shadow-sm">
                <Filter size={18} />
             </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 bg-gradient-to-br from-white to-slate-50 p-10 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 flex justify-between items-center relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-3">Your Projects Portfolio</p>
            <h3 className="text-6xl font-black text-slate-900 mb-6 tracking-tighter">{sites.length}</h3>
            <div className="flex gap-3">
              <span className="bg-orange-800 text-white px-5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-wider shadow-lg shadow-orange-900/10">
                {sites.filter(s => (s.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length} Active Projects
              </span>
              <button className="bg-white text-slate-800 border border-slate-200 px-5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-slate-50 transition-all">
                Export Data
              </button>
            </div>
          </div>
          <Compass size={180} className="text-slate-100 absolute -right-8 -bottom-10 rotate-12 group-hover:rotate-45 transition-transform duration-1000 ease-in-out" />
        </div>

        <div className="bg-orange-900 p-10 rounded-[2.5rem] text-white shadow-xl shadow-orange-900/20 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div>
            <p className="text-orange-300/60 text-[11px] font-bold uppercase tracking-widest mb-3">System Role</p>
            <h3 className="text-3xl font-black mb-4 capitalize">{user?.role || 'Guest'}</h3>
          </div>
          <p className="text-orange-50/70 text-sm font-medium leading-relaxed">
            {user?.role === 'admin' 
              ? "You have full administrative control over all enterprise projects and organizational data." 
              : "You are currently managing your assigned project sites and team allocations."}
          </p>
        </div>
      </div>

      {/* Site List Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden relative">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <h4 className="font-black text-slate-900 text-xl tracking-tight uppercase">Registry</h4>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Total: {filteredSites.length} items</span>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">
                <tr>
                <th className="px-10 py-6">Identity</th>
                <th className="px-10 py-6">Coordinates</th>
                <th className="px-10 py-6">Compliance</th>
                <th className="px-10 py-6">Supervisor</th>
                <th className="px-10 py-6 text-right">Operational Controls</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {loading ? (
                <tr>
                    <td colSpan="5" className="px-10 py-20">
                        <div className="flex flex-col items-center justify-center gap-4">
                            <Loader2 size={40} className="text-orange-800 animate-spin" />
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Synchronizing Project Data...</p>
                        </div>
                    </td>
                </tr>
                ) : filteredSites.length === 0 ? (
                <tr>
                    <td colSpan="5" className="px-10 py-24 text-center">
                        <div className="max-w-xs mx-auto">
                            <Building2 size={48} className="text-slate-200 mx-auto mb-4" />
                            <h5 className="text-slate-900 font-bold text-lg mb-2">No Projects Detected</h5>
                            <p className="text-slate-400 text-sm font-medium">Your portfolio is currently empty. Initialize your first site to begin documentation.</p>
                        </div>
                    </td>
                </tr>
                ) : (
                filteredSites.map((site) => (
                    <tr key={site.$id} className="group hover:bg-slate-50/80 transition-all duration-300">
                    <td className="px-10 py-7">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-orange-800 shadow-sm group-hover:scale-110 transition-transform">
                                <Building2 size={24} />
                            </div>
                            <div>
                                <p className="font-black text-slate-900 text-lg tracking-tight mb-0.5">{site.siteName || site.name}</p>
                                <div className="flex items-center gap-2">
                                    <Tag size={10} className="text-slate-300" />
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{site.siteId || site.$id.substring(0, 10)}</p>
                                </div>
                            </div>
                        </div>
                    </td>
                    <td className="px-10 py-7">
                        <div className="flex items-start gap-2">
                            <MapPin size={14} className="text-slate-400 mt-1 flex-shrink-0" />
                            <p className="text-sm text-slate-600 font-bold leading-relaxed">{site.location || site.loc || 'Global Standard'}</p>
                        </div>
                    </td>
                    <td className="px-10 py-7">
                        <div className="flex items-center">
                            <span className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-wider shadow-sm ${(site.status || 'ACTIVE').toUpperCase() === 'ACTIVE' 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                            {(site.status || 'ACTIVE').toUpperCase()}
                            </span>
                        </div>
                    </td>
                    <td className="px-10 py-7">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                                {(site.manager || 'U').charAt(0)}
                            </div>
                            <span className="text-sm font-black text-slate-700">{site.manager || 'Unassigned'}</span>
                        </div>
                    </td>
                    <td className="px-10 py-7">
                        <div className="flex items-center justify-end gap-3 translate-x-2 group-hover:translate-x-0 transition-transform">
                        <button
                            onClick={() => handleEditClick(site)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm"
                        >
                            <Edit3 size={14} /> Edit
                        </button>
                        <button
                            onClick={() => handleDeleteClick(site)}
                            className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100"
                            title="Delete Site"
                        >
                            <Trash2 size={16} />
                        </button>
                        </div>
                    </td>
                    </tr>
                ))
                )}
            </tbody>
            </table>
        </div>
      </div>

      {/* Edit Modal (Premium Revamp) */}
      {editingSite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl relative z-10 animate-in zoom-in-95 duration-300">
            <div className="bg-orange-800 p-10 text-white relative">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl"></div>
              <p className="text-orange-200 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Protocol Override</p>
              <h3 className="text-4xl font-black tracking-tighter mb-2">Refactor Project</h3>
              <p className="text-orange-100/60 text-sm font-medium">Modifying parameters for index {editingSite.$id.substring(0, 12)}</p>
            </div>

            <form onSubmit={handleUpdate} className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Site Identity</label>
                    <input
                        type="text"
                        value={editFormData.siteName}
                        onChange={(e) => setEditFormData({ ...editFormData, siteName: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:bg-white focus:outline-none transition-all font-bold text-slate-900 shadow-inner"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Coordinates</label>
                    <input
                        type="text"
                        value={editFormData.location}
                        onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:bg-white focus:outline-none transition-all font-bold text-slate-900 shadow-inner"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Supervisor</label>
                    <input
                        type="text"
                        value={editFormData.manager}
                        onChange={(e) => setEditFormData({ ...editFormData, manager: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:bg-white focus:outline-none transition-all font-bold text-slate-900 shadow-inner"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Compliance Status</label>
                    <select
                        value={editFormData.status}
                        onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:bg-white focus:outline-none transition-all font-bold text-slate-900 shadow-inner appearance-none cursor-pointer"
                    >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="ON HOLD">ON HOLD</option>
                    </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setEditingSite(null)}
                  className="px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={updateLoading}
                  className="px-10 py-4 bg-orange-800 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-orange-950 disabled:opacity-50 transition-all shadow-xl shadow-orange-900/20 active:scale-95"
                >
                  {updateLoading ? 'Synchronizing...' : 'Apply Modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
