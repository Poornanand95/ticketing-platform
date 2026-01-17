"use client";

import { useAuthStore } from "@/lib/auth/store";
import { LogOut, User } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";

export function Header() {
  const { user, logout } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center">
        <h2 className="text-lg font-semibold text-gray-900">Ticketing Platform</h2>
      </div>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center space-x-2 rounded-md px-3 py-2 hover:bg-gray-50"
        >
          <User className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            {user?.name || "User"}
          </span>
        </button>
        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 rounded-md border border-gray-200 bg-white shadow-lg">
            <div className="px-4 py-2 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4 text-gray-600" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}





