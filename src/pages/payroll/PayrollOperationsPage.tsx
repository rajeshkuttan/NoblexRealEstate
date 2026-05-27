import { Navigate } from "react-router-dom";

/** Legacy route — redirects to attendance control center. */
export default function PayrollOperationsPage() {
  return <Navigate to="/people/payroll/attendance-control" replace />;
}
