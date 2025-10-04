import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { Context } from '../main';

// Usage: <RequireAuth allowedRoles={["Admin","Doctor"]}><Component/></RequireAuth>
const RequireAuth = ({ allowedRoles = ['Admin'], children }) => {
  const { isAuthenticated, admin } = useContext(Context);
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const role = admin?.role || admin?.userRole || 'Admin';
  if (!allowedRoles.includes(role)) return <Navigate to="/" replace />;

  return children;
};

export default RequireAuth;
