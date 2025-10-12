import React, { useContext } from "react";
import { Context } from "../main";

/**
 * Usage:
 * <RequirePermission allowedRoles={["Admin", "Doctor"]}>
 *   <button>Delete</button>
 * </RequirePermission>
 * Only renders children if user role is in allowedRoles
 */
const RequirePermission = ({ allowedRoles = [], children }) => {
  const { admin } = useContext(Context);
  const userRole = admin?.role;
  if (!allowedRoles.includes(userRole)) return null;
  return <>{children}</>;
};

export default RequirePermission;
