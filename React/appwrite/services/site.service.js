import { databases, ID } from "../config/appwriteConfig";
import { DATABASE_ID, COLLECTIONS } from "../config/appwriteConfig";

//  Create Site
export const createSite = async (data) => {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.SITES,
    ID.unique(),
    data
  );
};

//  Get All Sites
export const getSites = async () => {
  return databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SITES
  );
};

// Update Site
export const updateSite = async (documentId, data) => {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.SITES,
    documentId,
    data
  );
};

// Delete Site
export const deleteSite = async (documentId) => {
  return databases.deleteDocument(
    DATABASE_ID,
    COLLECTIONS.SITES,
    documentId
  );
};

//  Ping Connection (Health Check)
export const pingAppwrite = async () => {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SITES, []);
    console.log("🟢 Appwrite Connection Successful! Received ping response:", response);
    return true;
  } catch (error) {
    console.error("🔴 Appwrite Connection Failed! Ping error:", error.message);
    return false;
  }
};