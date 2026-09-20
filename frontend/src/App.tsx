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

// Temporary pages (so sidebar routes don't redirect to Dashboard)
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="p-8 text-white">
    <h1 className="text-3xl font-bold mb-2">{title}</h1>
    <p className="text-slate-400">
      This page is connected successfully. You can build its features next.
    </p>
  </div>
);

const SalesPage = () => <PlaceholderPage title="Sales & Deals" />;
const TasksPage = () => <PlaceholderPage title="Tasks" />;
const CalendarPage = () => <PlaceholderPage title="Calendar" />;
const EmployeesPage = () => <PlaceholderPage title="Employees" />;
const ReportsPage = () => <PlaceholderPage title="Reports" />;
const SettingsPage = () => <PlaceholderPage title="Settings" />;
const NotificationsPage = () => <PlaceholderPage title="Notifications" />;

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected Routes */}
              <Route element={<AppLayout />}>
                <Route element={<RoleGuard />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/leads" element={<LeadsPage />} />
                  <Route path="/sales" element={<SalesPage />} />
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

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
