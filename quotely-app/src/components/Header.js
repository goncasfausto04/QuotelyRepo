import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Moon, Sun, Menu, X } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { useTheme } from "../context/ThemeContext.js";
import useAuthUser from "../hooks/useAuthUser.js";
import useIsAdmin from "../hooks/useIsAdmin.js";

const linkCls = "text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white";
const menuItemCls = "block w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700";

export default function Header() {
  const user = useAuthUser();
  const isAdmin = useIsAdmin(user);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    if (!user) return setPhotoUrl(null);
    supabase
      .from("users")
      .select("photo_url")
      .eq("auth_id", user.id)
      .maybeSingle()
      .then(({ data }) => setPhotoUrl(data?.photo_url || null));
  }, [user]);

  const links = user
    ? [
        ["/dashboard", "Dashboard"],
        ["/briefings", "Briefings"],
        ["/settings", "Settings"],
        ...(isAdmin ? [["/admin", "Admin"]] : []),
      ]
    : [["/auth", "Sign in"]];

  const logout = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between relative">
        <Link to="/" className="flex items-center gap-2 group">
          <img
            src="/blacklogo.jpg"
            alt="Quotely Logo"
            className="w-7 h-7 object-contain rounded"
          />
          <span className="text-lg font-semibold text-gray-900 dark:text-white">Quotely</span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          {links.map(([to, label]) => (
            <Link key={to} to={to} className={`hidden sm:inline-block ${linkCls}`}>
              {label}
            </Link>
          ))}
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Toggle dark mode">
            {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </button>

          {user ? (
            <>
              <Link to="/profile" title={user.email || "Profile"}>
                <img
                  src={photoUrl || `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(user.email || "User")}`}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700"
                />
              </Link>
              <button onClick={logout} className="hidden sm:inline-flex btn-ghost px-2">
                Logout
              </button>
            </>
          ) : (
            <Link to="/auth" className="btn-primary">
              Start
            </Link>
          )}

          <button onClick={() => setMenuOpen((s) => !s)} className="sm:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Toggle menu">
            {menuOpen ? <X className="w-5 h-5 text-gray-700 dark:text-gray-200" /> : <Menu className="w-5 h-5 text-gray-700 dark:text-gray-200" />}
          </button>
        </div>

        {menuOpen && (
          <div className="sm:hidden absolute right-4 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
            {[...links, ...(user ? [["/profile", "Profile"]] : [])].map(([to, label]) => (
              <Link key={to} to={to} onClick={() => setMenuOpen(false)} className={menuItemCls}>
                {label}
              </Link>
            ))}
            {user && (
              <button onClick={logout} className={`${menuItemCls} text-red-600 dark:text-red-400`}>
                Logout
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
