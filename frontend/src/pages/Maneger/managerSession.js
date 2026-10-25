// Manager session helpers (mirror of ownerSession.js, stored under its own key).
// Session shape: { id (staff id), ownerId, hotelId, hotelName, hotelCode, role, firstName, lastName, email, ... }
export const MANAGER_SESSION_KEY = "managerSession";

export const readManagerSession = () => {
  try {
    return JSON.parse(localStorage.getItem(MANAGER_SESSION_KEY) || "null");
  } catch {
    return null;
  }
};

export const persistManagerSession = (session, { merge = true } = {}) => {
  const current = merge ? readManagerSession() || {} : {};
  const next = { ...current, ...(session || {}) };
  localStorage.setItem(MANAGER_SESSION_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("managerSessionUpdated"));
  return next;
};

export const clearManagerSession = () => {
  localStorage.removeItem(MANAGER_SESSION_KEY);
  window.dispatchEvent(new Event("managerSessionUpdated"));
};
