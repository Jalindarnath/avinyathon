import { databases, ID, Query } from "../config/appwriteConfig";
import { DATABASE_ID, COLLECTIONS } from "../config/appwriteConfig";

//  Add Worker
export const addWorker = async (data) => {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.WORKERS,
    ID.unique(),
    data
  );
};

//  Get Workers by Site
export const getWorkersBySite = async (siteId) => {
  return databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.WORKERS,
    [Query.equal("siteId", siteId)]
  );
};

// Update Worker
export const updateWorker = async (documentId, data) => {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.WORKERS,
    documentId,
    data
  );
};

// Delete Worker
export const deleteWorker = async (documentId) => {
  return databases.deleteDocument(
    DATABASE_ID,
    COLLECTIONS.WORKERS,
    documentId
  );
};

// Get All Workers (RBAC admin)
export const getAllWorkers = async () => {
    return await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.WORKERS,
      []
    );
};

// Paginated Workers (Admin Global)
export const getPaginatedWorkers = async (limit = 10, offset = 0) => {
    return await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.WORKERS,
      [
        Query.limit(limit),
        Query.offset(offset),
        Query.orderDesc("$createdAt")
      ]
    );
};
