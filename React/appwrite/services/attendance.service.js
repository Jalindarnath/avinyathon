import { databases, ID, Query } from "../config/appwriteConfig";
import { DATABASE_ID, COLLECTIONS } from "../config/appwriteConfig";

// Add Attendance Record
export const addAttendance = async (data) => {
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.ATTENDANCE,
    ID.unique(),
    data
  );
};

// Get Attendance for a specific site and date range
export const getAttendanceBySiteAndDate = async (siteId, startDate, endDate) => {
  return databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.ATTENDANCE,
    [
      Query.equal("siteId", siteId),
      Query.greaterThanEqual("date", startDate),
      Query.lessThanEqual("date", endDate),
      Query.limit(100)
    ]
  );
};

// Get all Attendance for a specific site
export const getAttendanceBySite = async (siteId) => {
  return databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.ATTENDANCE,
    [
      Query.equal("siteId", siteId),
      Query.limit(5000)
    ]
  );
};

// Update Attendance Record
export const updateAttendance = async (documentId, data) => {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.ATTENDANCE,
    documentId,
    data
  );
};
