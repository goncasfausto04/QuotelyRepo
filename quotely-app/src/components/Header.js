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
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/blacklogo.jpg"
            alt="Quotely Logo"
            className="w-8 h-8 object-contain rounded-lg border border-gray-200"
          />
          <span className="text-xl font-bold">Quotely</span>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-8">
          {user ? (
            <>
              <Link
                to="/briefings"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Briefings
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
                    className="w-9 h-9 rounded-full border-2 border-gray-300 object-cover cursor-pointer hover:border-blue-600 transition"
                  />
                </Link>

                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition font-medium"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Sign in
              </Link>
              <Link
                to="/auth"
                className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition font-medium"
              >
                Start
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
