import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Chat from './pages/Chat';
import { useAuth } from './context/AuthContext';
import './App.css';

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p className="loading-text">Loading your chat session...</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return user ? <Navigate to="/chat" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to="/chat" replace />}
      />
      <Route
        path="/login"
        element={(
          <PublicRoute>
            <Login />
          </PublicRoute>
        )}
      />
      <Route
        path="/signup"
        element={(
          <PublicRoute>
            <Signup />
          </PublicRoute>
        )}
      />
      <Route
        path="/chat"
        element={(
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}
