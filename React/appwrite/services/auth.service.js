import { account, ID } from "../config/appwriteConfig";

export const authService = {
  // Signup for Manager
  async signup({ email, password, name }) {
    try {
      const userAccount = await account.create(ID.unique(), email, password, name);
      if (userAccount) {
        // Automatically login after signup
        return this.login({ email, password });
      }
      return userAccount;
    } catch (error) {
      console.error("AuthService :: signup :: error", error);
      throw error;
    }
  },

  // Login for Manager
  async login({ email, password }) {
    try {
      return await account.createEmailPasswordSession(email, password);
    } catch (error) {
      console.error("AuthService :: login :: error", error);
      throw error;
    }
  },

  // Logout
  async logout() {
    try {
      await account.deleteSessions();
    } catch (error) {
      console.error("AuthService :: logout :: error", error);
      throw error;
    }
  },

  // Get current user
  async getCurrentUser() {
    try {
      return await account.get();
    } catch (error) {
      // User not logged in or session expired
      console.log("AuthService :: getCurrentUser :: No active session");
      return null;
    }
  }
};

export default authService;
