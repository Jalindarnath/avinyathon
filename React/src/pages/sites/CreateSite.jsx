import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2, MapPin, Hash, ArrowLeft, User as UserIcon } from 'lucide-react';
import { createSite } from '../../../appwrite/services/site.service';
import { useSite } from '../../context/SiteContext';

export default function CreateSite() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setSelectedSite, fetchSites } = useSite();

  const [formData, setFormData] = useState({
    siteName: '',
    location: '',
    manager: '',
    siteId: `SD-${Math.floor(1000 + Math.random() * 9000)}` 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const siteData = {
        siteName: formData.siteName,
        location: formData.location,
        manager: formData.manager,
        siteId: formData.siteId,
        createdBy: user ? user.id : 'anonymous',
        status: 'ACTIVE'
      };

      const newSite = await createSite(siteData);
      setSelectedSite(newSite);
      await fetchSites();
      navigate('/');
    } catch (err) {
      console.error("Error creating site:", err);
      setError(err.message || "Failed to create site. Please check the required fields.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 ml-64 bg-slate-50 min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 font-medium text-sm transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-orange-800 p-8 text-white">
            <h2 className="text-3xl font-extrabold mb-2">Create New Site</h2>
            <p className="text-orange-100/80 text-sm">Fill in the details below to initialize a new construction project and add it to your portfolio.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                Project Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Building2 size={18} />
                </div>
                <input
                  type="text"
                  name="siteName"
                  value={formData.siteName}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-medium text-gray-800"
                  placeholder="e.g. Riverside Heights Complex"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                Location
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <MapPin size={18} />
                </div>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-medium text-gray-800"
                  placeholder="e.g. 142 West Boulevard, Downtown"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                Manager Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <UserIcon size={18} />
                </div>
                <input
                  type="text"
                  name="manager"
                  value={formData.manager}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-medium text-gray-800"
                  placeholder="e.g. Jane Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                Site ID (Auto-Generated)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Hash size={18} />
                </div>
                <input
                  type="text"
                  name="siteId"
                  value={formData.siteId}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-medium text-gray-800"
                  placeholder="e.g. SD-8392"
                />
              </div>
            </div>

            <div className="pt-4 mt-8 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-orange-700 to-orange-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-100 hover:shadow-orange-200 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {loading ? 'Creating...' : 'Create Site'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
