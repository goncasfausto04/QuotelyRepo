import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    confirmPassword: "",
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate("/briefings");
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) navigate("/briefings");
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === "password" || name === "confirmPassword") setPasswordError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(
          formData.email,
          {
            redirectTo: `${window.location.origin}/reset-password`,
          }
        );

        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg("Password reset email sent! Check your inbox.");
          setTimeout(() => {
            setIsForgotPassword(false);
            setSuccessMsg("");
          }, 3000);
        }
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) setErrorMsg(error.message);
      } else {
        if (formData.password !== formData.confirmPassword) {
          setPasswordError("Passwords do not match.");
          setIsLoading(false);
          return;
        }

        const { data: authData, error: authError } = await supabase.auth.signUp(
          {
            email: formData.email,
            password: formData.password,
          }
        );

        if (authError) {
          setErrorMsg(authError.message);
          setIsLoading(false);
          return;
        }

        const { error: dbError } = await supabase.from("users").insert([
          {
            auth_id: authData.user.id,
            email: authData.user.email,
            name: formData.name || null,
          },
        ]);

        if (dbError) {
          setErrorMsg(dbError.message);
          setIsLoading(false);
          return;
        }

        navigate("/briefings");
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
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-stretch gap-6">
          {/* Banner Image for md+ */}
          <div className="hidden md:block md:w-1/2 rounded-lg overflow-hidden shadow-xl">
            <img
              src="/banner.jpg"
              alt="Quotely Banner"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Mobile banner */}
          <div className="md:hidden w-full h-40 rounded-lg overflow-hidden shadow-md">
            <img
              src="/banner.jpg"
              alt="Quotely Banner"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Auth Card */}
          <div className="w-full md:w-1/2 bg-white border border-gray-200 rounded-lg shadow-sm p-6">
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
              {isForgotPassword ? "Reset Password" : "Welcome to Quotely"}
            </h2>
            <p
              className="text-center text-sm mb-6"
              style={{ color: "#797986" }}
            >
              {isForgotPassword
                ? "Enter your email to receive a reset link"
                : "Turn briefings into smart decisions"}
            </p>

            {/* Tab List */}
            {!isForgotPassword && (
              <div
                className="rounded-md p-1 mb-6 flex"
                style={{ background: "#F4F4F6" }}
              >
                <button
                  className={`flex-1 py-2 px-4 rounded text-sm font-semibold transition-all ${
                    isLogin ? "bg-white shadow-sm" : ""
                  }`}
                  style={{ color: isLogin ? "#17171C" : "#797986" }}
                  onClick={() => {
                    setIsLogin(true);
                    setErrorMsg("");
                    setSuccessMsg("");
                    setFormData((f) => ({ ...f, confirmPassword: "" }));
                    setPasswordError("");
                  }}
                >
                  Sign In
                </button>
                <button
                  className={`flex-1 py-2 px-4 rounded text-sm font-semibold transition-all ${
                    !isLogin ? "bg-white shadow-sm" : ""
                  }`}
                  style={{ color: !isLogin ? "#17171C" : "#797986" }}
                  onClick={() => {
                    setIsLogin(false);
                    setErrorMsg("");
                    setSuccessMsg("");
                    setPasswordError("");
                  }}
                >
                  Sign Up
                </button>
              </div>
            )}

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
              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                    required
                  />
                </div>
              )}

              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: "#17171C" }}
                >
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ border: "1px solid #E3E3E8", color: "#797986" }}
                  required
                />
              </div>

              {!isForgotPassword && (
                <div>
                  <label
                    className="block text-sm font-semibold mb-2"
                    style={{ color: "#17171C" }}
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
                    style={{ border: "1px solid #E3E3E8", color: "#797986" }}
                    required
                  />
                </div>
              )}

              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                    required
                  />
                  {passwordError && (
                    <p className="text-red-500 text-sm mt-1">{passwordError}</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  isLoading ||
                  (!isLogin &&
                    !isForgotPassword &&
                    formData.password !== formData.confirmPassword)
                }
                className={`w-full text-white py-2 px-4 rounded-md text-sm font-semibold transition-all ${
                  isLoading ||
                  (!isLogin &&
                    !isForgotPassword &&
                    formData.password !== formData.confirmPassword)
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:opacity-90"
                }`}
                style={{ background: "#000099" }}
              >
                {isLoading
                  ? "Loading..."
                  : isForgotPassword
                  ? "Send Reset Link"
                  : isLogin
                  ? "Sign In"
                  : "Sign Up"}
              </button>
            </form>

            {isForgotPassword && (
              <div className="text-center mt-4">
                <button
                  onClick={() => {
                    setIsForgotPassword(false);
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="text-sm font-medium hover:underline"
                  style={{ color: "#000099" }}
                >
                  ← Back to Sign In
                </button>
              </div>
            )}

            {!isForgotPassword && isLogin && (
              <div className="text-center mt-4">
                <button
                  onClick={() => {
                    setIsForgotPassword(true);
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="text-sm font-medium hover:underline"
                  style={{ color: "#000099" }}
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
