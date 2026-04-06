import { ID, Query } from "appwrite";
import { databases, DATABASE_ID, COLLECTIONS } from "../config/appwriteConfig";

export const getManagers = async () => {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.MANAGERS,
            [
                Query.orderDesc("$createdAt")
            ]
        );
        return response;
    } catch (error) {
        throw new Error("Failed to fetch managers: " + error.message);
    }
};

export const createManagerRecord = async (email, managerName, siteId) => {
    try {
        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.MANAGERS,
            ID.unique(),
            {
                email: email,
                manager: managerName,
                siteId: siteId
            }
        );
        return response;
    } catch (error) {
        throw new Error("Failed to create manager record: " + error.message);
    }
};

export const deleteManagerRecord = async (documentId) => {
    try {
        await databases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.MANAGERS,
            documentId
        );
        return true;
    } catch (error) {
        throw new Error("Failed to delete manager record: " + error.message);
    }
};
