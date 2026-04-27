import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '@/features/dashboard/pages/Dashboard';
import TickerDetail from '@/features/ticker-analysis/pages/TickerDetail';
import LiveFeed from '@/features/live-feed/pages/LiveFeed';
import Trends from '@/features/ticker-analysis/pages/Trends';
import Profile from '@/features/profile/pages/Profile';
import Auth from '@/features/auth/pages/Auth';
import VerifyEmail from '@/features/auth/pages/VerifyEmail';
import NotFound from '@/features/errors/pages/NotFound';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <LiveFeed />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trends"
          element={
            <ProtectedRoute>
              <Trends />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ticker/:ticker"
          element={
            <ProtectedRoute>
              <TickerDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
