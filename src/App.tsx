// App.tsx - Verify this matches exactly
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAppSelector } from './hooks/redux';
import { authService } from './services/authService';
import Auth from './components/Authentication/Auth';
import Header from './components/Header';
import BoardList from './components/Pages/BoardList';
import TaskBoard from './components/Pages/TaskBoard';
import Calendar from './components/Pages/Calendar'; // <- Make sure this import works

interface PrivateRouteProps {
  children: React.ReactNode;
}

function PrivateRoute({ children }: PrivateRouteProps) {
  const { user } = useAppSelector(state => state.auth);
  return user ? <>{children}</> : <Navigate to="/" />;
}

function TaskBoardWrapper() {
  const { boardId } = useParams<{ boardId: string }>();
  const { user } = useAppSelector(state => state.auth);
  
  if (!boardId) {
    return <Navigate to="/boards" />;
  }

  return <TaskBoard boardId={boardId} />;
}

function AppContent() {
  const { user, loading } = useAppSelector(state => state.auth);

  useEffect(() => {
    authService.initializeAuthListener();
    return () => authService.cleanup();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={!user ? <Auth /> : <Navigate to="/boards" />} />
        <Route
          path="/boards"
          element={
            <PrivateRoute>
              <Header />
              <BoardList />
            </PrivateRoute>
          }
        />
        <Route
          path="/board/:boardId"
          element={
            <PrivateRoute>
              <Header />
              <TaskBoardWrapper />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<p className="p-6 text-center">404 - Page Not Found</p>} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}