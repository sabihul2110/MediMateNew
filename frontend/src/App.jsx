// MediMate/frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AppProvider, useApp } from "./context/ThemeContext"
import { NotificationProvider } from "./context/NotificationContext"
import AppLayout      from "./layouts/AppLayout"
import Auth           from "./pages/Auth"
import Dashboard      from "./pages/Dashboard"
import MediScan       from "./pages/MediScan"
import Tracking       from "./pages/Tracking"
import Assistant      from "./pages/Assistant"
import Insights       from "./pages/Insights"
import Emergency      from "./pages/Emergency"
import HeartRisk      from "./pages/HeartRisk"
import Profile        from "./pages/Profile"
import FindDoctor     from "./pages/FindDoctor"
import ExportReport   from "./pages/ExportReport"
import Diet           from "./pages/Diet"
import HealthHistory  from "./pages/HealthHistory"   // ← NEW


function Guard({ children }) {
  const { user } = useApp()
  return user ? children : <Navigate to="/auth" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route element={<Guard><AppLayout /></Guard>}>
        <Route path="/"             element={<Dashboard />} />
        <Route path="/mediscan"     element={<MediScan />} />
        <Route path="/tracking"     element={<Tracking />} />
        <Route path="/assistant"    element={<Assistant />} />
        <Route path="/insights"     element={<Insights />} />
        <Route path="/emergency"    element={<Emergency />} />
        <Route path="/heart-risk"   element={<HeartRisk />} />
        <Route path="/profile"      element={<Profile />} />
        <Route path="/find-doctor"  element={<FindDoctor />} />
        <Route path="/export"       element={<ExportReport />} />
        <Route path="/diet"         element={<Diet />} />
        <Route path="/history"      element={<HealthHistory />} />  {/* ← NEW */}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider>
      <NotificationProvider>
        <BrowserRouter><AppRoutes /></BrowserRouter>
      </NotificationProvider>
    </AppProvider>
  )
}