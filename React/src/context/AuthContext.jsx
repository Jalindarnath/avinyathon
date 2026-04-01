import { createContext, useContext, useState, useEffect } from "react";
import authService from "../../appwrite/services/auth.service";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { id, name, email, role }
  const [loading, setLoading] = useState(true);

  // Admin Credentials (Fixed)
  const ADMIN_CREDENTIALS = {
    email: "admin@avinya.com",
    password: "Admin@123"
  };

  const login = async (email, password, role) => {
    if (role === "admin") {
      if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
        const adminUser = {
          id: "admin-root",
          name: "Administrator",
          email: email,
          role: "admin"
        };
        setUser(adminUser);
        localStorage.setItem("auth_user", JSON.stringify(adminUser));
        return true;
      } else {
        throw new Error("Invalid Admin credentials");
      }
    } else {
      // Manager Login via Appwrite
      try {
        await authService.login({ email, password });
        const appwriteUser = await authService.getCurrentUser();
        if (appwriteUser) {
          const managerUser = {
            id: appwriteUser.$id,
            name: appwriteUser.name,
            email: appwriteUser.email,
            role: "manager"
          };
          setUser(managerUser);
          localStorage.setItem("auth_user", JSON.stringify(managerUser));
          return true;
        }
      } catch (error) {
        console.error("AuthContext :: login :: manager error", error);
        throw error;
      }
    }
    return false;
  };

  const signup = async (email, password, name) => {
    try {
      await authService.signup({ email, password, name });
      const appwriteUser = await authService.getCurrentUser();
      if (appwriteUser) {
        const managerUser = {
          id: appwriteUser.$id,
          name: appwriteUser.name,
          email: appwriteUser.email,
          role: "manager"
        };
        setUser(managerUser);
        localStorage.setItem("auth_user", JSON.stringify(managerUser));
        return true;
      }
    } catch (error) {
      console.error("AuthContext :: signup :: error", error);
      throw error;
    }
    return false;
  };

  const logout = async () => {
    if (user?.role === "manager") {
      await authService.logout();
    }
    setUser(null);
    localStorage.removeItem("auth_user");
  };

  useEffect(() => {
    const checkAuthStatus = async () => {
      setLoading(true);
      const storedUser = localStorage.getItem("auth_user");
      
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role === "admin") {
          setUser(parsedUser);
        } else {
          // Verify Appwrite session for manager
          const appwriteUser = await authService.getCurrentUser();
          if (appwriteUser) {
            setUser(parsedUser);
          } else {
            localStorage.removeItem("auth_user");
            setUser(null);
          }
        }
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
