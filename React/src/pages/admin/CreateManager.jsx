import React, { useState, useEffect } from 'react';
import { managerCreationService } from '../../../appwrite/services/createManager.service.js';
import { getSites, updateSite } from '../../../appwrite/services/site.service.js';
import { createManagerRecord } from '../../../appwrite/services/manager.service.js';
import { useAuth } from '../../context/AuthContext';
import { Loader2, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';

const CreateManager = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [siteId, setSiteId] = useState('');
  
  const [availableSites, setAvailableSites] = useState([]);
  const [allSiteMap, setAllSiteMap] = useState({});
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSites, setLoadingSites] = useState(true);
  const [loadingManagers, setLoadingManagers] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    fetchAvailableSites();
    fetchAllManagers();
  }, [user]);

  const fetchAllManagers = async () => {
    try {
      setLoadingManagers(true);
      const res = await managerCreationService.getAllManagers();
      if (res.success) {
        setManagers(res.documents);
      } else {
        console.error("Failed to fetch managers:", res.error);
      }
    } catch (err) {
      console.error("Failed to fetch managers:", err);
    } finally {
      setLoadingManagers(false);
    }
  };

  const fetchAvailableSites = async () => {
    if (!user || user.role !== 'admin') {
      setLoadingSites(false);
      return;
    }
    try {
      setLoadingSites(true);
      setError('');
      
      const response = await getSites(user.user?.$id, 'admin');
      
      const sites = response?.documents || [];
      
      // Create a mapping for displaying site names in the managers table
      const map = {};
      sites.forEach(site => {
        map[site.$id] = site.siteName;
      });
      setAllSiteMap(map);
      
      // Filter out sites that don't have a manager assigned
      const unassignedSites = sites.filter(site => {
        // Site is unassigned if manager is null, undefined, or empty string
        return !site.manager || site.manager.trim() === '';
      });
      
      setAvailableSites(unassignedSites);
      
      if (unassignedSites.length > 0) {
        setSiteId(unassignedSites[0].$id);
      }
    } catch (err) {
      console.error("Failed to fetch available sites:", err);
      setError("Failed to load available sites: " + err.message);
    } finally {
      setLoadingSites(false);
    }
  };

  const handleCreateManager = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    // Ideally, only Admin should be able to create managers.
    if (user?.role !== 'admin') {
      setError('You are not authorized to create managers.');
      setLoading(false);
      return;
    }

    if (!siteId) {
      setError('Please select a site to assign.');
      setLoading(false);
      return;
    }

    try {
      // Find the site name to include in manager prefs if needed (though service just wants siteId)
      const result = await managerCreationService.createManager(email, password, name, siteId);
      
      if (result.success) {
        // Update the site with the newly created manager's info
        // We use the 'manager' field since 'managerId' doesn't exist in the schema
        await updateSite(siteId, {
          manager: name
        });
        
        // Also save to Managers collection
        await createManagerRecord(email, name, siteId);
        
        setMessage(`Manager ${name} created successfully and assigned to the selected site`);
        setName('');
        setEmail('');
        setPassword('');
        
        // Refresh the sites dropdown so the assigned site gets removed
        await fetchAvailableSites();
        await fetchAllManagers();
      } else {
        setError(result.error || 'Failed to create manager.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto mt-10 bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="mb-8 border-b pb-4">
        <h2 className="text-3xl font-bold text-slate-800">Create New Manager</h2>
        <p className="text-slate-500 mt-2">Assign an admin or site manager with a dedicated site workspace.</p>
      </div>

      {message && (
        <div className="mb-6 bg-emerald-50 text-emerald-700 p-4 rounded-lg flex items-center gap-3 border border-emerald-100">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium">{message}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-3 border border-red-100">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleCreateManager} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. John Doe"
              className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-[#f2711c] focus:border-[#f2711c] rounded-lg p-3 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Email Address (ID)</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="manager@example.com"
              className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-[#f2711c] focus:border-[#f2711c] rounded-lg p-3 transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Min. 8 characters"
            minLength="8"
            className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-[#f2711c] focus:border-[#f2711c] rounded-lg p-3 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Assign Site</label>
          {loadingSites ? (
            <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-500">
              Loading available sites...
            </div>
          ) : availableSites.length > 0 ? (
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-[#f2711c] focus:border-[#f2711c] rounded-lg p-3 transition-all"
            >
              {availableSites.map((site) => (
                <option key={site.$id} value={site.$id}>
                  {site.siteName} ({site.siteId})
                </option>
              ))}
            </select>
          ) : (
            <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-500">
              No unassigned sites available. Please create a new site first.
            </div>
          )}
          <p className="text-xs text-slate-500 mt-1">This binds the manager to their specific project data.</p>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button 
            type="submit"
            disabled={loading || availableSites.length === 0}
            className={`w-full bg-[#f2711c] hover:bg-[#d96215] text-white font-bold py-3.5 px-6 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 ${(loading || availableSites.length === 0) ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating Manager...</span>
              </>
            ) : (
              <>
                <span>Create Manager Profile</span>
                <UserPlus className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Managers List Section */}
      <div className="mt-12 border-t pt-8">
        <h3 className="text-2xl font-bold text-slate-800 mb-6">Assigned Managers</h3>
        
        {loadingManagers ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-[#f2711c]" />
          </div>
        ) : managers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-sm font-semibold text-slate-600">Manager Name</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Email</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Site Name</th>
                </tr>
              </thead>
              <tbody>
                {managers.map(manager => (
                  <tr key={manager.$id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-800 font-medium">{manager.manager}</td>
                    <td className="p-4 text-slate-600">{manager.email}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f2711c]/10 text-[#f2711c]">
                        {allSiteMap[manager.siteId] || manager.siteId || 'None'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
            <p className="text-slate-500">No managers assigned yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateManager;
