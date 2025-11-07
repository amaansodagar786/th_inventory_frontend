// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Get current path to check permission
  const currentPath = window.location.pathname.replace('/', '');

  // Special case for home route
  const isHomeRoute = currentPath === '';

  // ✅ FIXED: If user is admin OR has admin permission, allow all routes
  if (user.role === 'admin' || user.permissions?.includes('admin')) {
    return children;
  }

  // Check if user has permission for current route
  let hasPermission = false;

  if (isHomeRoute) {
    // For home route, check dashboard permission
    hasPermission = user.permissions?.includes('dashboard');
  } else {
    // For other routes, check exact permission
    hasPermission = user.permissions?.includes(currentPath);
  }

  if (!hasPermission) {
    // Redirect to first permitted page or login if no permissions
    if (user.permissions?.length > 0) {
      const firstPermission = user.permissions[0];
      const redirectPath = firstPermission === 'dashboard' ? '/' :
        firstPermission === 'purchase-order' ? '/purchase-order' :
          `/${firstPermission}`;
      return <Navigate to={redirectPath} replace />;
    } else {
      // No permissions at all - logout and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;