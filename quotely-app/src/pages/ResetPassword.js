import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has a valid recovery session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setErrorMsg("Invalid or expired password reset link.");
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setPasswordError("");
    setIsLoading(true);

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg("Password updated successfully! Redirecting to login...");
        setTimeout(() => {
          navigate("/auth");
        }, 2000);
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background:
          "linear-gradient(0deg, rgba(244, 244, 246, 0.3), rgba(244, 244, 246, 0.3)), #F9F8F6",
      }}
    >
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm px-8 py-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/whitelogo.jpg"
            alt="Quotely Logo"
            className="w-16 h-16 object-contain"
          />
        </div>

        {/* Heading */}
        <h2
          className="text-xl font-semibold text-center mb-1"
          style={{ color: "#17171C", letterSpacing: "-0.6px" }}
        >
          Set New Password
        </h2>
        <p className="text-center text-sm mb-6" style={{ color: "#797986" }}>
          Enter your new password below
        </p>

        {/* Error/Success Messages */}
        {errorMsg && (
          <div
            className="mb-4 p-3 rounded-md text-sm"
            style={{ background: "#FEE2E2", color: "#991B1B" }}
          >
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div
            className="mb-4 p-3 rounded-md text-sm"
            style={{ background: "#D1FAE5", color: "#065F46" }}
          >
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: "#17171C" }}
            >
              New Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError("");
              }}
              className="w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ border: "1px solid #E3E3E8", color: "#797986" }}
              required
              minLength={6}
            />
          </div>

          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: "#17171C" }}
            >
              Confirm New Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setPasswordError("");
              }}
              className="w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ border: "1px solid #E3E3E8", color: "#797986" }}
              required
              minLength={6}
            />
            {passwordError && (
              <p className="text-red-500 text-sm mt-1">{passwordError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || password !== confirmPassword}
            className={`w-full text-white py-2 px-4 rounded-md text-sm font-semibold transition-all ${
              isLoading || password !== confirmPassword
                ? "opacity-50 cursor-not-allowed"
                : "hover:opacity-90"
            }`}
            style={{ background: "#000099" }}
          >
            {isLoading ? "Updating..." : "Update Password"}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/auth")}
            className="text-sm font-medium hover:underline"
            style={{ color: "#000099" }}
          >
            ← Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
