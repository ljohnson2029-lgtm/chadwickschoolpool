import { Navigate } from "react-router-dom";

// Redirect old /family-links route to Profile page which now contains family links
export default function FamilyLinks() {
  return <Navigate to="/profile" replace />;
}
