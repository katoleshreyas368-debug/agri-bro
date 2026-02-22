import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
    const { user, token } = useAuth();

    // If completely unauthenticated
    if (!user || !token) {
        return <Navigate to="/login" replace />;
    }

    // If a specific role is required and user role doesn't match
    if (allowedRoles && !allowedRoles.includes(user.type)) {
        return <Navigate to={`/dashboard/${user.type}`} replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
