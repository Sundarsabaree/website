import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.js";
import { canAccess } from "../../config/roleAccess.js";

// Sends the user back to the dashboard when their role cannot open the
// current route (e.g. a Sales Executive typing /employees in the address bar).
export const RoleGuard: React.FC = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!canAccess(user?.role, pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
