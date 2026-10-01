import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext.js";
import { AuthProvider } from "./context/AuthContext.js";
import { NotificationProvider } from "./context/NotificationContext.js";
import { AppLayout } from "./components/layout/AppLayout.js";
import { LoginPage } from "./pages/auth/LoginPage.js";
import { RegisterPage } from "./pages/auth/RegisterPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { CustomersPage } from "./pages/CustomersPage.js";
import ProfilePage from "./pages/ProfilePage.js";
import { RoleGuard } from "./components/layout/RoleGuard.js";
import { LeadsPage } from "./pages/LeadsPage.js";
import { EmployeesPage } from "./pages/EmployeesPage.js";
import { DealsPage } from "./pages/DealsPage.js";
import { TasksPage } from "./pages/TasksPage.js";
import { CalendarPage } from "./pages/CalendarPage.js";
import NotificationsPage from "./pages/NotificationsPage.js";
import ReportsPage from "./pages/ReportsPage.js";
import SettingsPage from "./pages/SettingsPage.js";
import { LandingPage } from "./pages/LandingPage.js";

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <Routes>
              {/* Public Routes — accessible without authentication */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected Routes — require authentication */}
              <Route element={<AppLayout />}>
                <Route element={<RoleGuard />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/leads" element={<LeadsPage />} />
                  <Route path="/sales" element={<DealsPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/employees" element={<EmployeesPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route
                    path="/notifications"
                    element={<NotificationsPage />}
                  />
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>
              </Route>

              {/* Catch-all — redirect to landing if unknown route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
