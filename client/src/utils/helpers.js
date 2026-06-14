export const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatTime = (timeStr) => {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 || 12;
  return `${display}:${m} ${suffix}`;
};

export const STATUS_STYLES = {
  Pending:   "bg-yellow-100 text-yellow-800 border border-yellow-300",
  Assigned:  "bg-blue-100 text-blue-800 border border-blue-300",
  Completed: "bg-green-100 text-green-800 border border-green-300",
  Cancelled: "bg-red-100 text-red-800 border border-red-300",
};

export const getStatusStyle = (status) =>
  STATUS_STYLES[status] || "bg-gray-100 text-gray-600 border border-gray-300";