import { Navigate, Route, Routes } from "react-router-dom";
import { useIsAuthenticated } from "@/hooks";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import TransactionsPage from "@/pages/TransactionsPage";
import AccountsPage from "@/pages/AccountsPage";
import CategoriesPage from "@/pages/CategoriesPage";
import StatementsPage from "@/pages/StatementsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import AnomaliesPage from "@/pages/AnomaliesPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFoundPage from "@/pages/NotFoundPage";

function RequireAuth({ children }: { children: JSX.Element }) {
  const authed = useIsAuthenticated();
  return authed ? children : <Navigate to="/login" replace />;
}

function RedirectIfAuthed({ children }: { children: JSX.Element }) {
  const authed = useIsAuthenticated();
  return authed ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/register"
        element={
          <RedirectIfAuthed>
            <RegisterPage />
          </RedirectIfAuthed>
        }
      />

      <Route
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="statements" element={<StatementsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="anomalies" element={<AnomaliesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
