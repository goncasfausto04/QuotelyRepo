import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    confirmPassword: "",
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const navigate = useNavigate();

  // Redirect if already logged in
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
    // Clear any password validation message when user edits password fields
    if (name === "password" || name === "confirmPassword") setPasswordError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) setErrorMsg(error.message);
    } else {
      // validate passwords match before calling signUp
      if (formData.password !== formData.confirmPassword) {
        setPasswordError("Passwords do not match.");
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        setErrorMsg(authError.message);
        return;
      }

      // Insert user row (RLS is disabled, so this works)
      const { error: dbError } = await supabase.from("users").insert([
        {
          auth_id: authData.user.id,
          email: authData.user.email,
          name: formData.name || null,
        },
      ]);

      if (dbError) {
        setErrorMsg(dbError.message);
        return;
      }

      navigate("/briefings");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isLogin ? "Login" : "Register"}
        </h2>

        <div className="flex justify-center mb-4">
          <button
            className={`px-4 py-2 rounded-l ${
              isLogin ? "bg-blue-500 text-white" : "bg-gray-200"
            }`}
            onClick={() => {
              setIsLogin(true);
              // clear any previous error and confirmPassword when switching modes
              setErrorMsg("");
              setFormData((f) => ({ ...f, confirmPassword: "" }));
              setPasswordError("");
            }}
          >
            Login
          </button>
          <button
            className={`px-4 py-2 rounded-r ${
              !isLogin ? "bg-blue-500 text-white" : "bg-gray-200"
            }`}
            onClick={() => {
              setIsLogin(false);
              // clear any previous error when switching modes
              setErrorMsg("");
              setPasswordError("");
            }}
          >
            Register
          </button>
        </div>

        {errorMsg && <p className="text-red-500 mb-2">{errorMsg}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            />
          )}
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
          {!isLogin && (
            <>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-1">{passwordError}</p>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={
              !isLogin && formData.password !== formData.confirmPassword
            }
            className={`w-full bg-blue-500 text-white p-2 rounded ${
              !isLogin && formData.password !== formData.confirmPassword
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {isLogin ? "Login" : "Register"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            className="text-blue-500"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Register" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}
