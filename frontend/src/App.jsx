import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { AudioCallProvider } from './contexts/AudioContext';

import HomePage from './pages/HomePage';
import HostRoomPage from './pages/HostRoomPage';
import CreateRoomPage from './pages/CreateRoomPage';
import JoinRoomPage from './pages/JoinRoomPage';
import RoomWorkspacePage from './pages/RoomWorkspacePage';
import RoomExpiredPage from './pages/RoomExpiredPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import NotFoundPage from './pages/NotFoundPage';

import ScrollToAnchor from './components/common/ScrollToAnchor';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AudioCallProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ScrollToAnchor />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/host" element={<HostRoomPage />} />
              <Route path="/create" element={<HostRoomPage />} />
              <Route path="/join" element={<JoinRoomPage />} />
              <Route path="/join/:roomId" element={<JoinRoomPage />} />
              <Route path="/room/:roomId" element={<RoomWorkspacePage />} />
              <Route path="/room/:roomId/expired" element={<RoomExpiredPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AudioCallProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
