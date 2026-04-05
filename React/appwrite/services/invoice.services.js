import { databases, storage, BUCKET_ID, DATABASE_ID, COLLECTIONS, ID, Query } from "../config/appwriteConfig";

//  Add Invoice
export const addInvoice = async (data) => {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.INVOICES,
    ID.unique(),
    data
  );
};

//  Upload Invoice File
export const uploadInvoiceFile = async (file) => {
  return storage.createFile(
    BUCKET_ID,
    ID.unique(),
    file
  );
};

// Get Invoices by Site
export const getInvoicesBySite = async (siteId) => {
  return databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.INVOICES,
    [Query.equal("siteId", siteId)]
  );
};

// Update Invoice
export const updateInvoice = async (documentId, data) => {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.INVOICES,
    documentId,
    data
  );
};

// Delete Invoice
export const deleteInvoice = async (documentId) => {
  return databases.deleteDocument(
    DATABASE_ID,
    COLLECTIONS.INVOICES,
    documentId
  );
};

// Get File Preview URL
export const getFilePreview = (fileId) => {
  return storage.getFileView(BUCKET_ID, fileId);
};
export const getAllInvoices = async () => {
    return databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICES, [Query.limit(100), Query.orderDesc($createdAt)]);
};
