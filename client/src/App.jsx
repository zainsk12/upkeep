// client/src/App.jsx

import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { initializeTheme } from "./utils/theme";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";

import LandingPage    from "./pages/LandingPage";
import LoginPage          from "./pages/auth/LoginPage";
import SignupPage         from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ProfilePage    from "./pages/ProfilePage";
import SettingsPage   from "./pages/SettingsPage";
import ServicesPage   from "./pages/ServicesPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import AllReviewsPage from "./pages/AllReviewsPage";

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-bg">
    <div className="text-center">
      <div className="text-5xl mb-4">🔧</div>
      <h1 className="text-2xl font-bold text-text">404 — Not Found</h1>
      <p className="text-muted mt-2">This page does not exist.</p>
    </div>
  </div>
);

export default function App() {
  // Apply saved theme (light/dark) immediately on every mount —
  // prevents a flash of the wrong theme on refresh.
  useEffect(() => {
    initializeTheme();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            closeButton
            expand={false}
            visibleToasts={5}
            gap={8}
            offset={20}
            toastOptions={{
              duration: 4000,
              style: {
                background:     "var(--primary-dark)",
                border:         "1px solid rgba(255,255,255,0.12)",
                color:          "#e8f2f6",
                borderRadius:   "14px",
                fontSize:       "13.5px",
                fontWeight:     "500",
                boxShadow:      "0 8px 32px rgba(8,53,74,0.35)",
                backdropFilter: "blur(12px)",
                pointerEvents:  "auto",
              },
              classNames: {
                success:     "!border-emerald-500/25",
                error:       "!border-red-400/25",
                loading:     "!border-blush/20",
                closeButton: "!bg-white/10 !border-white/10 hover:!bg-white/20 !text-white/70",
              },
            }}
          />

          <Routes>
            {/* Public */}
            <Route path="/"        element={<><Navbar /><LandingPage /></>} />
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/signup"          element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/services"     element={<><Navbar /><ServicesPage /></>} />
            <Route path="/services/:id" element={<><Navbar /><ServicesPage /></>} />
            <Route path="/reviews"      element={<><Navbar /><AllReviewsPage /></>} />

            {/* Protected — Customer */}
            <Route path="/profile" element={
              <PrivateRoute><><Navbar /><ProfilePage /></></PrivateRoute>
            } />
            <Route path="/settings" element={
              <PrivateRoute><><Navbar /><SettingsPage /></></PrivateRoute>
            } />
            <Route path="/settings/account" element={
              <PrivateRoute><><Navbar /><SettingsPage /></></PrivateRoute>
            } />
            <Route path="/settings/appearance" element={
              <PrivateRoute><><Navbar /><SettingsPage /></></PrivateRoute>
            } />
            <Route path="/settings/getting-started" element={
              <PrivateRoute><><Navbar /><SettingsPage /></></PrivateRoute>
            } />
            <Route path="/my-bookings" element={
              <PrivateRoute><><Navbar /><MyBookingsPage /></></PrivateRoute>
            } />
            <Route path="/book/:serviceId" element={
              <PrivateRoute><><Navbar /><ServicesPage /></></PrivateRoute>
            } />

            <Route path="*" element={<><Navbar /><NotFound /></>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}