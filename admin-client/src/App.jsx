// admin-client/src/App.jsx

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import AdminRoute from "./components/AdminRoute";
import Layout from "./components/Layout";

import LoginPage    from "./pages/LoginPage";
import Dashboard    from "./pages/Dashboard";
import BookingsPage from "./pages/BookingsPage";
import ServicesPage from "./pages/ServicesPage";
import WorkersPage  from "./pages/WorkersPage";   // ← ADDED
import ReviewsPage  from "./pages/ReviewsPage";   // MODULE 6

export default function App() {
  return (
    <AdminAuthProvider>
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
              background:    "#1a1d27",
              border:        "1px solid rgba(99,102,241,0.25)",
              color:         "#e2e8f0",
              borderRadius:  "12px",
              fontSize:      "13.5px",
              fontWeight:    "500",
              boxShadow:     "0 8px 32px rgba(0,0,0,0.4)",
              pointerEvents: "auto",
            },
            classNames: {
              success:     "!border-emerald-500/30",
              error:       "!border-red-500/30",
              closeButton: "!bg-white/10 !border-white/10 hover:!bg-white/20 !text-white/70",
            },
          }}
        />

        <Routes>
          {/* Public — Admin Login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Admin Routes */}
          <Route path="/dashboard" element={
            <AdminRoute>
              <Layout><Dashboard /></Layout>
            </AdminRoute>
          } />
          <Route path="/bookings" element={
            <AdminRoute>
              <Layout><BookingsPage /></Layout>
            </AdminRoute>
          } />
          <Route path="/services" element={
            <AdminRoute>
              <Layout><ServicesPage /></Layout>
            </AdminRoute>
          } />
          <Route path="/workers" element={        // ← ADDED
            <AdminRoute>
              <Layout><WorkersPage /></Layout>
            </AdminRoute>
          } />
          <Route path="/reviews" element={        // MODULE 6
            <AdminRoute>
              <Layout><ReviewsPage /></Layout>
            </AdminRoute>
          } />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}