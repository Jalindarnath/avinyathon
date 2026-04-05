import { databases, ID, Query } from "../config/appwriteConfig";
import { DATABASE_ID, COLLECTIONS } from "../config/appwriteConfig";

//  Add Engineer
export const addEngineer = async (data) => {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.ENGINEERS,
    ID.unique(),
    data
  );
};

//  Get Engineers by Site
export const getEngineersBySite = async (siteId) => {
  return databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.ENGINEERS,
    siteId ? [Query.equal("siteId", siteId)] : []
  );
};

// Update Engineer
export const updateEngineer = async (documentId, data) => {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.ENGINEERS,
    documentId,
    data
  );
};

// Delete Engineer
export const deleteEngineer = async (documentId) => {
  return databases.deleteDocument(
    DATABASE_ID,
    COLLECTIONS.ENGINEERS,
    documentId
  );
};

// Get All Engineers (RBAC admin)
export const getAllEngineers = async () => {
    return await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ENGINEERS,
      []
    );
};

// Paginated Engineers (Admin Global)
export const getPaginatedEngineers = async (limit = 10, offset = 0) => {
    return await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ENGINEERS,
      [
        Query.limit(limit),
        Query.offset(offset),
        Query.orderDesc("$createdAt")
      ]
    );
};
