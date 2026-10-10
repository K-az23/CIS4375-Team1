import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import { homeFor } from '../context/authUtils.js';
import Loading from './Loading';

export default function ProtectedRoute({ allow, children }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) return <Loading message="Checking your account…" fullPage />;

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (allow && !allow.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;

  return children;
}