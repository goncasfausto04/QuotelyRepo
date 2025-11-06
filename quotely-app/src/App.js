import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header.js";
import Footer from "./components/Footer.js";
import LandingPage from "./pages/LandingPage.js";
import BriefingPage from "./pages/BriefingPage.js";
import Profile from "./pages/Profile.js";
import AuthPage from "./pages/AuthPage.js";
import ProtectedRoute from "./components/ProtectedRoute.js";
import Briefings from "./pages/Briefings.js";
import CreateBriefing from "./pages/CreateBriefing.js";

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Protected Routes */}
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

        {/* Public Route */}
        <Route path="/auth" element={<AuthPage />} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;
