import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { getSites } from "../../appwrite/services/site.service";

const SiteContext = createContext();

export const SiteProvider = ({ children }) => {
  const { user, loading } = useAuth();
  const [selectedSite, setSelectedSite] = useState(null);
  const [sites, setSites] = useState([]);

  const role = user?.role || "manager";
  const userId = user?.id || null;

  const fetchSites = useCallback(async () => {
    if (loading || !userId) return;

    try {
      const response = await getSites(userId, role);
      setSites(response.documents || []);
      
      // If there are sites but none selected, select the first one
      if (response.documents?.length > 0 && !selectedSite) {
        setSelectedSite(response.documents[0]);
      }
    } catch (error) {
      console.error("SiteContext :: fetchSites :: error", error);
    }
  }, [loading, userId, role, selectedSite]);

  useEffect(() => {
    if (userId) {
      fetchSites();
    } else {
      setSites([]);
      setSelectedSite(null);
    }
  }, [userId, fetchSites]);

  return (
    <SiteContext.Provider value={{ selectedSite, setSelectedSite, sites, setSites, fetchSites, role, userId }}>
      {children}
    </SiteContext.Provider>
  );
};

export const useSite = () => useContext(SiteContext);