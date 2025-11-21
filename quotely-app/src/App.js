import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext.js";
import Header from "./components/Header.js";
import Footer from "./components/Footer.js";
import LandingPage from "./pages/LandingPage.js";
import BriefingPage from "./pages/BriefingPage.js";
import Profile from "./pages/Profile.js";
import AuthPage from "./pages/AuthPage.js";
import ResetPassword from "./pages/ResetPassword.js";
import ProtectedRoute from "./components/ProtectedRoute.js";
import Briefings from "./pages/Briefings.js";
import CreateBriefing from "./pages/CreateBriefing.js";
import SupplierResponse from "./pages/SupplierResponse.js";
import Dashboard from "./pages/Dashboard.js";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<LandingPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/briefingpage"
            element={
              <ProtectedRoute>
                <BriefingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/briefings"
            element={
              <ProtectedRoute>
                <Briefings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/briefings/create-briefing"
            element={
              <ProtectedRoute>
                <CreateBriefing />
              </ProtectedRoute>
            }
          />

          {/* Public Routes */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* ✅ ADD THIS - Public Supplier Response Route */}
          <Route
            path="/supplier-response/:token"
            element={<SupplierResponse />}
          />
        </Routes>
        <Footer />
      </Router>
    </ThemeProvider>
  );
}

export default App;
