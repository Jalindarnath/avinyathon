import { useState, useEffect } from 'react';
import { Building2, Plus, Compass, Trash2, Lock, Search, Filter, Loader2, Tag, MapPin, Edit3, Globe, Activity, CheckCircle2 } from 'lucide-react';
import { updateSite, deleteSite } from '../../appwrite/services/site.service';
import { useSite } from '../context/SiteContext';
import { useAuth } from '../context/AuthContext';

export default function SiteManagement() {
  const { user } = useAuth();
  const { sites, fetchSites } = useSite();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const isAdmin = user?.role === 'admin';

  const Math = window.Math;
  
  const filteredSites = sites?.filter(site => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (site.siteName || site.name || '').toLowerCase().includes(term) ||
      (site.location || site.loc || '').toLowerCase().includes(term)
    );
  }) || [];

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
      // Only fetch sites if admin
      if (isAdmin) {
        await fetchSites();
      }
      setLoading(false);
    }
    initialize();
  }, [isAdmin, fetchSites]);

  if (!isAdmin) {
    return (
      <div className="flex-1 ml-64 bg-slate-50 min-h-screen p-8 flex items-center justify-center">
        <div className="bg-white p-10 rounded-xl border border-slate-200 shadow-sm text-center max-w-md">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Restricted</h2>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            You do not have permission to view or manage the global site infrastructure. This area is reserved for system administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 ml-64 bg-slate-50 min-h-screen p-8">
      {/* Header Section */}
      <header className="flex justify-between items-center mb-8 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full bg-[#f2711c]"></div>
             <p className="text-[#f2711c] text-[10px] font-bold uppercase tracking-widest">Global Infrastructure</p>
          </div>
          <h2 className="text-3xl font-bold text-slate-800">Site Management</h2>
          <p className="text-slate-500 text-sm font-medium">Control projects, monitor status, and manage site assignments.</p>
        </div>
        
        <div className="flex items-center gap-4">
             <div className="relative group">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#f2711c] transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search projects by name or location..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 pr-6 py-2.5 bg-white border border-slate-200 rounded-lg w-80 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f2711c] transition-all shadow-sm"
                />
             </div>
             <button className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-[#f2711c] hover:border-[#f2711c] transition-all shadow-sm">
                <Filter size={18} />
             </button>
        </div>
      </header>

      {/* Global Metrics Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="relative z-10">
               <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Projects</p>
               <h3 className="text-3xl font-bold text-slate-800">{sites.length}</h3>
               <p className="text-slate-400 text-[10px] font-medium mt-2">Active Frameworks</p>
            </div>
            <Globe size={100} className="text-slate-50 absolute -right-4 -bottom-4 rotate-12 transition-transform duration-1000 group-hover:rotate-45" />
         </div>
         
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="relative z-10">
               <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Operational Sites</p>
               <h3 className="text-3xl font-bold text-emerald-600">{sites.filter(s => (s.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length}</h3>
               <p className="text-slate-400 text-[10px] font-medium mt-2">Live Status</p>
            </div>
            <Activity size={100} className="text-slate-50 absolute -right-4 -bottom-4 transition-transform duration-1000 group-hover:scale-110" />
         </div>

         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="relative z-10">
               <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Completed Jobs</p>
               <h3 className="text-3xl font-bold text-blue-600">{sites.filter(s => (s.status || '').toUpperCase() === 'COMPLETED').length}</h3>
               <p className="text-slate-400 text-[10px] font-medium mt-2">Finalized Documentation</p>
            </div>
            <CheckCircle2 size={100} className="text-slate-50 absolute -right-4 -bottom-4 transition-transform duration-1000 group-hover:-translate-y-2" />
         </div>
      </div>

      {/* Registry Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
               <Building2 size={20} className="text-[#f2711c]" />
               <h4 className="font-bold text-slate-800">Project Registry</h4>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total: {filteredSites.length} Entries</span>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead className="bg-white border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Site Identity</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Location</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Compliance</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Assignment</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic-none">
                {loading ? (
                <tr>
                    <td colSpan="5" className="px-6 py-20">
                        <div className="flex flex-col items-center justify-center gap-3">
                            <Loader2 size={32} className="text-[#f2711c] animate-spin" />
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Syncing Global Data...</p>
                        </div>
                    </td>
                </tr>
                ) : filteredSites.length === 0 ? (
                <tr>
                    <td colSpan="5" className="px-6 py-24 text-center">
                        <div className="max-w-xs mx-auto">
                            <Building2 size={40} className="text-slate-200 mx-auto mb-4" />
                            <h5 className="text-slate-800 font-bold text-lg mb-1">No Projects Found</h5>
                            <p className="text-slate-400 text-xs font-medium">Initialize your first site to begin documentation and management.</p>
                        </div>
                    </td>
                </tr>
                ) : (
                filteredSites.map((site) => (
                    <tr key={site.$id} className="group hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-600 transition-all group-hover:scale-105">
                                  <Building2 size={18} />
                              </div>
                              <div>
                                  <p className="font-bold text-slate-800">{site.siteName || site.name}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                      <Tag size={10} className="text-slate-400" />
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: {site.siteId || site.$id.substring(0, 8)}</p>
                                  </div>
                              </div>
                          </div>
                      </td>
                      <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                              <MapPin size={14} className="text-slate-300" />
                              <p className="text-xs text-slate-600 font-bold leading-relaxed">{site.location || site.loc || 'Global Standard'}</p>
                          </div>
                      </td>
                      <td className="px-6 py-5">
                          <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${(site.status || 'ACTIVE').toUpperCase() === 'ACTIVE' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                          {(site.status || 'ACTIVE').toUpperCase()}
                          </span>
                      </td>
                      <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-[#f2711c] text-[10px] font-bold border border-orange-100">
                                  {(site.manager || 'U').charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-bold text-slate-700">{site.manager || 'Unassigned'}</span>
                          </div>
                      </td>
                      <td className="px-6 py-5">
                          <div className="flex items-center justify-end gap-2">
                             <button
                               onClick={() => handleEditClick(site)}
                               className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                               title="Edit Site"
                             >
                               <Edit3 size={16} />
                             </button>
                             <button
                               onClick={() => handleDeleteClick(site)}
                               className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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

      {/* Modern Simplified Edit Modal */}
      {editingSite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setEditingSite(null)}></div>
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden relative z-10 shadow-2xl border border-slate-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <Edit3 size={18} className="text-slate-600" />
                   </div>
                   <div>
                      <h3 className="text-lg font-bold text-slate-800">Update Project</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Index: {editingSite.$id.substring(0, 10)}</p>
                   </div>
                </div>
                <button 
                  onClick={() => setEditingSite(null)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-all text-slate-400"
                >
                  <X size={20} />
                </button>
             </div>
             
             <form onSubmit={handleUpdate} className="p-6 space-y-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Site Name</label>
                  <input 
                    type="text" 
                    value={editFormData.siteName}
                    onChange={(e) => setEditFormData({...editFormData, siteName: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] focus:border-[#f2711c] transition-all" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Site Location</label>
                  <input 
                    type="text" 
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({...editFormData, location: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] focus:border-[#f2711c] transition-all" 
                    required
                  />
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Supervisor / Manager</label>
                    <input 
                      type="text" 
                      value={editFormData.manager}
                      onChange={(e) => setEditFormData({...editFormData, manager: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] focus:border-[#f2711c] transition-all" 
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Operational Status</label>
                    <select
                        value={editFormData.status}
                        onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f2711c] focus:border-[#f2711c] appearance-none cursor-pointer transition-all"
                    >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="ON HOLD">ON HOLD</option>
                    </select>
                </div>
                
                <div className="pt-4 flex gap-3">
                   <button 
                     type="button"
                     onClick={() => setEditingSite(null)}
                     className="flex-1 px-4 py-3 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                   >
                     Discard
                   </button>
                   <button 
                     type="submit" 
                     disabled={updateLoading}
                     className="flex-1 bg-[#f2711c] text-white font-bold py-3 rounded-lg shadow-sm hover:bg-[#d96215] transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                   >
                     {updateLoading ? <Loader2 className="animate-spin" size={14}/> : 'Save Changes'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Minimal X component for modal closing as lucid-react might not have X in all versions or the user's import list
function X({ size, className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    );
}
