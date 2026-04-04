export const generateInvoiceData = ({
  title,
  amount,
  type,
  referenceId,
  siteId,
  status = "pending",
}) => {
  return {
    title,
    amount,
    type,
    referenceId,
    siteId,
    status,
    date: new Date().toISOString().split("T")[0],
  };
};