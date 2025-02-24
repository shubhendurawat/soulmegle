import React from "react";
import { useNavigate } from "react-router-dom";

const Navbar = ({ user }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user")
    navigate("/login");
  };

  return (
    <nav className="flex justify-between p-4 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold text-amber-500">Soulmegle</h1>
      <div className="flex gap-4">
        <p className="text-2xl text-amber-500">Hi, {user?.name}</p>
        <button onClick={handleLogout} className="bg-red-500 px-3 py-1 rounded">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
