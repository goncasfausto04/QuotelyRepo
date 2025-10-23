import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const [user, setUser] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get current user from Supabase Auth
    supabase.auth.getUser().then(async ({ data }) => {
      const authUser = data?.user;
      setUser(authUser);

      if (authUser) {
        // Fetch user info from 'users' table
        const { data: profile, error } = await supabase
          .from("users")
          .select("photo_url, name")
          .eq("auth_id", authUser.id)
          .single();

        if (!error && profile) setPhotoUrl(profile.photo_url);
      }
    });

    // Listen for auth changes
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
    <header className="bg-blue-600 text-white p-4 flex justify-between items-center">
      <Link to="/" className="font-bold text-xl">
        Quotely
      </Link>

      <nav className="flex items-center space-x-4">
        {user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>

            {/* Profile Picture (clickable) */}
            <div className="flex items-center space-x-2">
              <Link to="/profile" title={user?.email || "Profile"}>
                <img
                  src={
                    photoUrl ||
                    "https://ui-avatars.com/api/?background=random&name=" +
                      encodeURIComponent(user.email || "User")
                  }
                  alt={user?.name || user?.email || "User"}
                  className="w-9 h-9 rounded-full border-2 border-white object-cover cursor-pointer"
                />
              </Link>

              <button
                onClick={handleLogout}
                className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <Link to="/auth">Login/Register</Link>
        )}
      </nav>
    </header>
  );
}
