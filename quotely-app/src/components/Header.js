import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="bg-blue-600 text-white p-4 flex justify-between items-center">
      <h1 className="font-bold text-xl">Quotely</h1>
      <nav>
        <Link className="mr-4" to="/">
          Home
        </Link>
        <Link className="mr-4" to="/dashboard">
          Dashboard
        </Link>
        <Link to="/profile">Profile</Link>
      </nav>
    </header>
  );
}
