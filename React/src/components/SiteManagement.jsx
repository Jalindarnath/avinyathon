import { useState, useEffect } from 'react';
import { Building2, Plus, Compass, Trash2 } from 'lucide-react';
import { updateSite, deleteSite } from '../../appwrite/services/site.service';
import { useSite } from '../context/SiteContext';

export default function SiteManagement() {
  const { sites, fetchSites } = useSite();
  const [loading, setLoading] = useState(true);

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
      // Refresh context 
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
      await fetchSites();
      setLoading(false);
    }
    initialize();
  }, []);

  return (
    <div className="flex-1 ml-64 bg-slate-50 min-h-screen p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-orange-800 text-[10px] font-bold uppercase tracking-widest mb-1">Infrastructure Hub</p>
          <h2 className="text-4xl font-extrabold text-gray-800">Site Management</h2>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-gray-50 flex justify-between items-center relative overflow-hidden">
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Active Projects</p>
            <h3 className="text-3xl font-black text-gray-800 mb-4">{sites.length}</h3>
            <div className="flex gap-2">
              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold">{sites.filter(s => s.status === 'ACTIVE').length} Active</span>
            </div>
          </div>
          <Compass size={120} className="text-gray-50 absolute -right-4 -bottom-4 rotate-12" />
        </div>

        <div className="bg-[#005B8E] p-8 rounded-2xl text-white">
          <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-2">Team Overview</p>
          <h3 className="text-5xl font-black mb-6">Staffing</h3>
          <p className="text-blue-100 text-sm font-medium">Manage your sites and assign managers efficiently to all your active projects.</p>
        </div>
      </div>

      {/* Site List Table */}
      <div className="bg-white rounded-2xl border border-gray-50 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100/50 text-[10px] uppercase tracking-widest text-gray-400 font-bold">
            <tr>
              <th className="px-6 py-5">Site Name</th>
              <th className="px-6 py-5">Location</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5">Manager</th>
              <th className="px-6 py-5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan="5" className="px-6 py-6 text-center text-gray-500">Loading sites...</td></tr>
            ) : sites.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-6 text-center text-gray-500">No sites found. Create one from the sidebar!</td></tr>
            ) : (
              sites.map((site) => (
                <tr key={site.$id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-6 flex items-center gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl text-orange-800"><Building2 size={20} /></div>
                    <div>
                      <p className="font-bold text-sm text-gray-800">{site.siteName || site.name}</p>
                      <p className="text-[10px] text-gray-400 font-medium">Project {site.siteId || site.$id.substring(0, 8)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-sm text-gray-500 font-medium">{site.location || site.loc || 'Not specified'}</td>
                  <td className="px-6 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold ${
                      (site.status || 'ACTIVE') === 'ACTIVE' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {site.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-6 py-6 flex items-center gap-3">
                     <span className="text-sm font-bold text-gray-700">{site.manager || 'Unassigned'}</span>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEditClick(site)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
                      >
                        Edit 
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(site)}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
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

      {/* Edit Modal */}
      {editingSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingSite(null)}></div>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative z-10">
            <div className="bg-orange-800 p-6 text-white">
              <h3 className="text-2xl font-bold">Edit Site</h3>
              <p className="text-orange-100 text-sm">Update details for project {editingSite.siteId || editingSite.$id.substring(0, 8)}</p>
            </div>
            
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">
                  Site Name
                </label>
                <input 
                  type="text" 
                  value={editFormData.siteName}
                  onChange={(e) => setEditFormData({...editFormData, siteName: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">
                  Location
                </label>
                <input 
                  type="text" 
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({...editFormData, location: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">
                  Manager 
                </label>
                <input 
                  type="text" 
                  value={editFormData.manager}
                  onChange={(e) => setEditFormData({...editFormData, manager: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">
                  Status
                </label>
                <select 
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="ON HOLD">ON HOLD</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setEditingSite(null)}
                  className="px-4 py-2 rounded-lg text-gray-500 font-bold hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateLoading}
                  className="px-6 py-2 bg-orange-800 text-white rounded-lg font-bold hover:bg-orange-700 disabled:opacity-50 transition-colors"
                >
                  {updateLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
