import { Client, Databases, Account, Storage, ID, Query } from "appwrite";

const client = new Client();

client
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const databases = new Databases(client);
export const account = new Account(client);
export const storage = new Storage(client);

export { ID, Query };

// 🔹 IDs
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET;

export const COLLECTIONS = {
  SITES: import.meta.env.VITE_APPWRITE_SITES,
  WORKERS: import.meta.env.VITE_APPWRITE_WORKERS,
  ENGINEERS: import.meta.env.VITE_APPWRITE_ENGINEERS,
  ATTENDANCE: import.meta.env.VITE_APPWRITE_ATTENDENCE,
  PAYMENTS: import.meta.env.VITE_APPWRITE_PAYMENT,
  INVENTORY: import.meta.env.VITE_APPWRITE_INVENTORY,
  INVOICES: import.meta.env.VITE_APPWRITE_INVOICES,
  SITE_FINANCE: import.meta.env.VITE_APPWRITE_SITEFINANCE,
  MANAGERS: import.meta.env.VITE_APPWRITE_MANAGERS,
};