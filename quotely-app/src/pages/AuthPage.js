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
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
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
          <div className="w-full md:w-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6">
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
              className="text-xl font-semibold text-center mb-1 text-gray-900 dark:text-white"
              style={{ letterSpacing: "-0.6px" }}
            >
              {isForgotPassword ? "Reset Password" : "Welcome to Quotely"}
            </h2>
            <p className="text-center text-sm mb-6 text-gray-600 dark:text-gray-400">
              {isForgotPassword
                ? "Enter your email to receive a reset link"
                : "Turn briefings into smart decisions"}
            </p>

            {/* Tab List */}
            {!isForgotPassword && (
              <div className="rounded-md p-1 mb-6 flex bg-gray-100 dark:bg-gray-700">
                <button
                  className={`flex-1 py-2 px-4 rounded text-sm font-semibold transition-all ${
                    isLogin ? "bg-white dark:bg-gray-600 shadow-sm" : ""
                  } ${
                    isLogin
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
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
                    !isLogin ? "bg-white dark:bg-gray-600 shadow-sm" : ""
                  } ${
                    !isLogin
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
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
              <div className="mb-4 p-3 rounded-md text-sm bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 rounded-md text-sm bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                {successMsg}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500"
                  required
                />
              </div>

              {!isForgotPassword && (
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500"
                    required
                  />
                </div>
              )}

              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500"
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
                className={`w-full bg-blue-700 dark:bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-semibold transition-all ${
                  isLoading ||
                  (!isLogin &&
                    !isForgotPassword &&
                    formData.password !== formData.confirmPassword)
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-blue-800 dark:hover:bg-blue-700"
                }`}
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
                  className="text-sm font-medium hover:underline text-blue-700 dark:text-blue-400"
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
                  className="text-sm font-medium hover:underline text-blue-700 dark:text-blue-400"
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
