import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import GamePage from './pages/Game/GamePage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import LobbyPage from './pages/Lobby/LobbyPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import './App.css';

function App() {
  const { loadUser } = useAuthStore();
  
  useEffect(() => {
    loadUser();
  }, [loadUser]);
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/lobby"
          element={
            <ProtectedRoute>
              <LobbyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/:gameId"
          element={
            <ProtectedRoute>
              <GamePage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate replace to="/lobby" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;