import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext.js";
import Header from "./components/Header.js";
import Footer from "./components/Footer.js";
import ProtectedRoute from "./components/ProtectedRoute.js";
import LandingPage from "./pages/LandingPage.js";
import AuthPage from "./pages/AuthPage.js";
import ResetPassword from "./pages/ResetPassword.js";
import SupplierResponse from "./pages/SupplierResponse.js";
import Dashboard from "./pages/Dashboard.js";
import Briefings from "./pages/Briefings.js";
import CreateBriefing from "./pages/CreateBriefing.js";
import BriefingPage from "./pages/BriefingPage.js";
import Profile from "./pages/Profile.js";
import Settings from "./pages/Settings.js";
import Admin from "./pages/Admin.js";
import { warmUpBackend } from "./api.js";

// Start waking the backend (Render free tier sleeps after 15 min idle) as soon
// as anyone opens the site, instead of on their first real request.
warmUpBackend();

const PUBLIC_ROUTES = [
  ["/", LandingPage],
  ["/auth", AuthPage],
  ["/reset-password", ResetPassword],
  ["/supplier-response/:token", SupplierResponse],
];

const PRIVATE_ROUTES = [
  ["/dashboard", Dashboard],
  ["/briefings", Briefings],
  ["/briefings/create-briefing", CreateBriefing],
  ["/briefingpage", BriefingPage],
  ["/profile", Profile],
  ["/settings", Settings],
  ["/admin", Admin],
];

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <Header />
        <Routes>
          {PUBLIC_ROUTES.map(([path, Page]) => (
            <Route key={path} path={path} element={<Page />} />
          ))}
          {PRIVATE_ROUTES.map(([path, Page]) => (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute>
                  <Page />
                </ProtectedRoute>
              }
            />
          ))}
        </Routes>
        <Footer />
      </Router>
    </ThemeProvider>
  );
}
