"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useRouter, usePathname } from "next/navigation";

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
  };

  if (pathname === "/login") {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link
              href="/tickets"
              className="flex items-center px-3 py-2 text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors"
            >
              Customer Portal
            </Link>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
              <Link
                href="/tickets"
                className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-semibold transition-colors ${
                  pathname === "/tickets"
                    ? "border-blue-500 text-gray-900"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                My Tickets
              </Link>
              <Link
                href="/tickets/new"
                className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-semibold transition-colors ${
                  pathname === "/tickets/new"
                    ? "border-blue-500 text-gray-900"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                New Ticket
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm font-medium text-gray-700">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}


