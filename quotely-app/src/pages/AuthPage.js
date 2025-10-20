import { useState } from "react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      alert(`Logging in with\nEmail: ${formData.email}`);
    } else {
      alert(
        `Registering new user\nName: ${formData.name}\nEmail: ${formData.email}`
      );
    }
    setFormData({ email: "", password: "", name: "" });
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
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            className={`px-4 py-2 rounded-r ${
              !isLogin ? "bg-blue-500 text-white" : "bg-gray-200"
            }`}
            onClick={() => setIsLogin(false)}
          >
            Register
          </button>
        </div>

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
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded"
          >
            {isLogin ? "Login" : "Register"}
          </button>
        </form>

        {isLogin ? (
          <p className="mt-4 text-center text-sm">
            Don't have an account?{" "}
            <button className="text-blue-500" onClick={() => setIsLogin(false)}>
              Register
            </button>
          </p>
        ) : (
          <p className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <button className="text-blue-500" onClick={() => setIsLogin(true)}>
              Login
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
