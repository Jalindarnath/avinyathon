import { databases, ID, Query } from "../config/appwriteConfig";
import { DATABASE_ID, COLLECTIONS } from "../config/appwriteConfig";

/* =======================================================
   ➕ CREATE FINANCE RECORD (when site is created)
======================================================= */
export const createFinance = async (data) => {
  try {
    return await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.SITE_FINANCE,
      ID.unique(),
      data
    );
  } catch (error) {
    console.error("Create Finance Error:", error);
  }
};

/* =======================================================
   📥 GET FINANCE BY SITE
======================================================= */
export const getFinanceBySite = async (siteId) => {
  try {
    const res = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SITE_FINANCE,
      [Query.equal("siteId", siteId)]
    );

    return res.documents[0]; // one record per site
  } catch (error) {
    console.error("Get Finance Error:", error);
  }
};

/* =======================================================
   🔄 UPDATE FINANCE (generic)
======================================================= */
export const updateFinance = async (docId, updatedData) => {
  try {
    return await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.SITE_FINANCE,
      docId,
      updatedData
    );
  } catch (error) {
    console.error("Update Finance Error:", error);
  }
};

// UPDATE MATERIAL
export const updateMaterialExpense = async (siteId, amount) => {
  try {
    const finance = await getFinanceBySite(siteId);
    if (!finance) return; // Cannot update if no budget/finance record exists

    const updated = {
      materialCost: (finance.materialCost || 0) + amount,
      expenses: (finance.expenses || 0) + amount,
      remainingBudget:
        (finance.budget || 0) - ((finance.expenses || 0) + amount),
    };

    return await updateFinance(finance.$id, updated);
  } catch (error) {
    console.error("Material Expense Error:", error);
  }
};

//LABOUR PAYMENT UPDATE ON CASHOUT
export const updateLaborCost = async (siteId, amount) => {
  try {
    const finance = await getFinanceBySite(siteId);
    if (!finance) return; // Cannot update if no budget document exists

    const currentExpenses = (finance.expenses || 0) + amount;
    const updated = {
      labourcost: (finance.labourcost || 0) + amount,
      expenses: currentExpenses,
      remainingBudget: (finance.budget || 0) - currentExpenses,
    };

    return await updateFinance(finance.$id, updated);
  } catch (error) {
    console.error("Labor Cost Error:", error);
  }
};

// ENGINEER PAYMENT UPDATE
export const updateEngineerCost = async (siteId, amount) => {
  try {
    const finance = await getFinanceBySite(siteId);
    if (!finance) return; 

    const currentExpenses = (finance.expenses || 0) + amount;
    const updated = {
      engineerCost: (finance.engineerCost || 0) + amount,
      expenses: currentExpenses,
      remainingBudget: (finance.budget || 0) - currentExpenses,
    };

    return await updateFinance(finance.$id, updated);
  } catch (error) {
    console.error("Engineer Cost Error:", error);
  }
};

// =======================================================
// ➖ DEDUCTIONS (Subtract from costs)
// =======================================================

export const deductLaborCost = async (siteId, amount) => {
  try {
    const finance = await getFinanceBySite(siteId);
    const updated = {
      labourcost: Math.max(0, (finance.labourcost || 0) - amount),
      expenses: Math.max(0, (finance.expenses || 0) - amount),
      remainingBudget: (finance.budget || 0) - Math.max(0, (finance.expenses || 0) - amount)
    };
    return await updateFinance(finance.$id, updated);
  } catch (error) {
    console.error("Deduct Labor Cost Error:", error);
  }
};

export const deductEngineerCost = async (siteId, amount) => {
  try {
    const finance = await getFinanceBySite(siteId);
    if (!finance) return; 
    const updated = {
      engineerCost: Math.max(0, (finance.engineerCost || 0) - amount),
      expenses: Math.max(0, (finance.expenses || 0) - amount),
      remainingBudget: (finance.budget || 0) - Math.max(0, (finance.expenses || 0) - amount)
    };
    return await updateFinance(finance.$id, updated);
  } catch (error) {
    console.error("Deduct Engineer Cost Error:", error);
  }
};

export const checkBudgetAlert = (finance) => {
  const threshold = (finance.budget || 0) * 0.2;

  if (finance.remainingBudget < threshold) {
    return "⚠️ Low Budget Warning";
  }

  return "Budget OK";
};