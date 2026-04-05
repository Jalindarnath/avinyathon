import React, { createContext, useContext, useState, useEffect } from "react";
import { loginService } from "../../appwrite/services/auth.service";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await loginService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, expectedRole) => {
    const res = await loginService.login(email, password);
    
    // Check if the actual user role matches what was selected on the login page
    if (res.role !== expectedRole) {
      await loginService.logout();
      setUser(null);
      throw new Error(`Unauthorized access!`);
    }

    setUser(res);
    return res;
  };

  const logout = async () => {
    await loginService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, checkUser, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
