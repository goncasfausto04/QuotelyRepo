import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const [user, setUser] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const navigate = useNavigate();

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
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-blue-500">
          Quotely
        </Link>

        <nav className="flex items-center gap-6">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="text-gray-700 hover:text-gray-900"
              >
                Dashboard
              </Link>

              <div className="flex items-center gap-3">
                <Link to="/profile" title={user?.email || "Profile"}>
                  <img
                    src={
                      photoUrl ||
                      "https://ui-avatars.com/api/?background=random&name=" +
                        encodeURIComponent(user.email || "User")
                    }
                    alt={user?.name || user?.email || "User"}
                    className="w-9 h-9 rounded-full border-2 border-gray-300 object-cover cursor-pointer hover:border-blue-500 transition"
                  />
                </Link>

                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Dashboard hidden for unauthenticated users */}
              <Link
                to="/auth"
                className="bg-blue-500 text-white px-5 py-2 rounded-md hover:bg-blue-600 transition"
              >
                Get Started
              </Link>
              <Link
                to="/auth"
                className="border border-gray-300 text-gray-700 px-5 py-2 rounded-md hover:bg-gray-50 transition"
              >
                Sign In
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
