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