import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./components/AuthContext";
import { RefreshProvider } from "./components/RefreshContext";
import { CONFIG } from "./config";
import Login from "./pages/Login";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import UserStatistics from "./pages/UserStatistics";
import ChannelStatistics from "./pages/ChannelStatistics";
import ProtectedRoute from "./components/ProtectedRoute";
import Base from "./components/Base";
import MessageStats from "./pages/MessageStats";
import Database from "./pages/Database";
import MessageDetail from "./pages/MessageDetail";
import UserProfile from "./pages/UserProfile";
import Random from "./pages/Random";

function App() {
  useEffect(() => {
    document.title = CONFIG.title;
  }, []);

  return (
    <AuthProvider>
      <RefreshProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <Base>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/messagestats" element={<MessageStats />} />
                      <Route path="/userstats" element={<UserStatistics />} />
                      <Route
                        path="/channelstats"
                        element={<ChannelStatistics />}
                      />
                      <Route path="/database" element={<Database />} />
                      <Route
                        path="/database/message/:id"
                        element={<MessageDetail />}
                      />
                      <Route path="/user/:username" element={<UserProfile />} />
                      <Route path="/random" element={<Random />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Base>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </RefreshProvider>
    </AuthProvider>
  );
}

export default App;
