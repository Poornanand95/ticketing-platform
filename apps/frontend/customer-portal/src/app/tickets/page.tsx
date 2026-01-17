"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { Navbar } from "@/components/navbar";
import type { Ticket } from "@/lib/api";

const statusColors = {
  open: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  resolved: "bg-blue-100 text-blue-800",
  closed: "bg-gray-100 text-gray-800",
};

const priorityColors = {
  low: "text-gray-600",
  medium: "text-blue-600",
  high: "text-orange-600",
  urgent: "text-red-600",
};

export default function TicketsPage() {
  const { apiClient, isLoading: authLoading, token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const isInitialMount = useRef(true);

  // Initialize filters from URL params on mount
  useEffect(() => {
    const status = searchParams.get("status") || "";
    const priority = searchParams.get("priority") || "";
    setStatusFilter(status);
    setPriorityFilter(priority);
    // Mark that initial mount is complete after a brief delay
    const timer = setTimeout(() => {
      isInitialMount.current = false;
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  // Update URL when filters change (but not on initial mount)
  useEffect(() => {
    // Skip URL update on initial mount
    if (isInitialMount.current) {
      return;
    }

    const currentStatus = searchParams.get("status") || "";
    const currentPriority = searchParams.get("priority") || "";
    
    // Only update URL if filters actually changed from URL params
    if (statusFilter !== currentStatus || priorityFilter !== currentPriority) {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      
      const queryString = params.toString();
      const newUrl = queryString ? `/tickets?${queryString}` : "/tickets";
      
      router.push(newUrl, { scroll: false });
    }
  }, [statusFilter, priorityFilter, router, searchParams]);

  const loadTickets = useCallback(async () => {
    // Don't load tickets if auth is still loading or token is not available
    if (authLoading || !token) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      const params: { status?: string; priority?: string } = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const data = await apiClient.getTickets(params);
      setTickets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [apiClient, statusFilter, priorityFilter, authLoading, token]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Support Tickets</h1>
                <p className="mt-2 text-sm text-gray-500">
                  View and manage all your support requests in one place
                </p>
              </div>
              <Link
                href="/tickets/new"
                className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-semibold rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors whitespace-nowrap"
              >
                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Ticket
              </Link>
            </div>
          </div>

          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold text-blue-900 mb-1">Quick Guide</p>
                <p className="text-sm text-blue-700 leading-relaxed">
                  Use the filters to find tickets by status or priority. Click any ticket to view details and continue the conversation with our support team.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px] sm:min-w-[250px]">
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full px-4 py-2.5 rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm transition-colors appearance-none cursor-pointer"
                style={{ minHeight: '42px' }}
              >
                <option value="">All Statuses</option>
                <option value="open">Open - Active tickets awaiting response</option>
                <option value="pending">Pending - Waiting for your response</option>
                <option value="resolved">Resolved - Issues that have been fixed</option>
                <option value="closed">Closed - Completed tickets</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px] sm:min-w-[250px]">
              <label htmlFor="priority-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Priority
              </label>
              <select
                id="priority-filter"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="block w-full px-4 py-2.5 rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm transition-colors appearance-none cursor-pointer"
                style={{ minHeight: '42px' }}
              >
                <option value="">All Priorities</option>
                <option value="low">Low - General inquiries</option>
                <option value="medium">Medium - Standard support requests</option>
                <option value="high">High - Important issues</option>
                <option value="urgent">Urgent - Critical issues requiring immediate attention</option>
              </select>
            </div>
            {(statusFilter || priorityFilter) && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setStatusFilter("");
                    setPriorityFilter("");
                  }}
                  className="px-4 py-2.5 text-sm font-semibold text-gray-900 bg-white border border-gray-300 hover:text-gray-900 hover:bg-gray-50 rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  style={{ minHeight: '42px' }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error loading tickets</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                    <p className="mt-2">Please try refreshing the page or contact support if the issue persists.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-16 bg-white rounded-lg shadow">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading your tickets...</p>
              <p className="mt-2 text-sm text-gray-500">Please wait while we fetch your support requests</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg shadow">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No tickets found</h3>
              <p className="mt-2 text-sm text-gray-500">
                {statusFilter || priorityFilter
                  ? "No tickets match your current filters. Try adjusting your search criteria."
                  : "You haven't created any support tickets yet. Get started by creating your first ticket."}
              </p>
              <div className="mt-6">
                <Link
                  href="/tickets/new"
                  className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent shadow-sm text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Your First Ticket
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">
                  Showing <span className="font-semibold text-gray-900">{tickets.length}</span>{" "}
                  {tickets.length === 1 ? "ticket" : "tickets"}
                  {(statusFilter || priorityFilter) && " matching your filters"}
                </p>
              </div>
              <ul className="divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <li key={ticket.id}>
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="block hover:bg-gray-50 transition-colors"
                    >
                      <div className="px-6 py-5 sm:px-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center flex-1 min-w-0 gap-3">
                            <p className="text-sm font-bold text-blue-600 truncate">
                              {ticket.ticket_number}
                            </p>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                statusColors[ticket.status]
                              }`}
                            >
                              {ticket.status}
                            </span>
                            <span
                              className={`text-sm font-semibold capitalize ${priorityColors[ticket.priority]}`}
                            >
                              {ticket.priority}
                            </span>
                          </div>
                          <div className="flex-shrink-0">
                            <p className="text-sm text-gray-500">
                              {formatDate(ticket.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="text-base font-semibold text-gray-900 leading-snug">{ticket.subject}</p>
                        </div>
                        <div className="mt-3 flex items-center text-xs font-medium text-gray-600">
                          <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Created {formatDate(ticket.created_at)}</span>
                          {ticket.updated_at !== ticket.created_at && (
                            <>
                              <span className="mx-2">•</span>
                              <span>Updated {formatDate(ticket.updated_at)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}


