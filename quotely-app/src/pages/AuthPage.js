import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { useNavigate } from "react-router-dom";
import { ensureUserProfile } from "../userProfile.js";

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
            // Stored on the auth user too, so the profile row can be created later
            options: { data: { name: formData.name || null } },
          }
        );

        if (authError) {
          setErrorMsg(authError.message);
          setIsLoading(false);
          return;
        }

        // With "Confirm email" enabled there is no session yet, so we can't
        // write to the users table (RLS) – the row is created on first login.
        if (!authData.session) {
          setSuccessMsg("Account created! Check your inbox to confirm your email, then sign in.");
          setIsLogin(true);
          return;
        }

        const { error: dbError } = await ensureUserProfile(authData.user, formData.name);
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
    <div className="px-4 sm:px-6 py-10 sm:py-16">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-stretch gap-6">
          {/* Banner Image for md+ */}
          <div className="hidden md:block md:w-1/2 rounded-lg overflow-hidden shadow-sm">
            <img
              src="/banner.jpg"
              alt="Quotely Banner"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Mobile banner */}
          <div className="md:hidden w-full h-40 rounded-lg overflow-hidden ">
            <img
              src="/banner.jpg"
              alt="Quotely Banner"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Auth Card */}
          <div className="card w-full md:w-1/2 p-6 sm:p-8 self-center">
            {/* Heading */}
            <h2
              className="text-xl font-semibold text-center mb-1 text-gray-900 dark:text-white"
             
            >
              {isForgotPassword ? "Reset your password" : isLogin ? "Sign in to Quotely" : "Create your account"}
            </h2>
            <p className="text-center text-sm mb-6 text-gray-600 dark:text-gray-400">
              {isForgotPassword
                ? "Enter your email to receive a reset link"
                : "Your requests, supplier replies and quotes in one place"}
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
                  Sign in
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
                  Create account
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
                  <label className="label">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
              )}

              <div>
                <label className="label">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              {!isForgotPassword && (
                <div>
                  <label className="label">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
              )}

              {!isLogin && (
                <div>
                  <label className="label">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="input"
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
                className="btn-primary w-full"
              >
                {isLoading
                  ? "Please wait…"
                  : isForgotPassword
                  ? "Send reset link"
                  : isLogin
                  ? "Sign in"
                  : "Create account"}
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
                  ← Back to sign in
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
                  Forgot your password?
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
