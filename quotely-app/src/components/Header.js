import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";
import { useNavigate } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext.js";

export default function Header() {
  const [user, setUser] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const authUser = data?.user;
      setUser(authUser);

      if (authUser) {
        const { data: profile, error } = await supabase
          .from("users")
          .select("photo_url, name")
          .eq("auth_id", authUser.id)
          .single();

        if (!error && profile) setPhotoUrl(profile.photo_url);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user || null)
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm transition-colors sticky top-0 z-50 backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img
              src="/blacklogo.jpg"
              alt="Quotely Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-lg border border-gray-200 dark:border-gray-700 group-hover:border-blue-500 dark:group-hover:border-blue-400 transition-colors"
            />
            <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              Quotely
            </span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="hidden sm:inline-block text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  to="/briefings"
                  className="hidden sm:inline-block text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                >
                  Briefings
                </Link>

                <div className="flex items-center gap-2 sm:gap-3">
                  <Link to="/profile" title={user?.email || "Profile"}>
                    <img
                      src={
                        photoUrl ||
                        "https://ui-avatars.com/api/?background=random&name=" +
                          encodeURIComponent(user.email || "User")
                      }
                      alt={user?.name || user?.email || "User"}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-gray-300 dark:border-gray-600 object-cover cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-all hover:scale-105"
                    />
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="hidden sm:block bg-red-500 dark:bg-red-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-red-600 dark:hover:bg-red-700 transition-all font-medium text-sm active:scale-95"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors text-sm sm:text-base"
                >
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  className="bg-blue-600 dark:bg-blue-700 text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-all font-medium text-sm sm:text-base shadow-sm hover:shadow active:scale-95"
                >
                  Start
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
