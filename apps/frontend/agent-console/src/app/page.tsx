"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/lib/auth/store";
import { ticketsApi } from "@/lib/api/tickets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ticket, Clock, CheckCircle, AlertCircle, RefreshCw, GitBranch, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreateTicketModal } from "@/components/tickets/create-ticket-modal";
import type { Ticket as TicketType } from "@/types";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    assigned: 0,
    open: 0,
    pending: 0,
    closed: 0,
  });
  const [recentTickets, setRecentTickets] = useState<TicketType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      const [allTickets, myTickets] = await Promise.all([
        ticketsApi.list({ limit: 100 }),
        ticketsApi.list({ assigned_to: user.id, limit: 10 }),
      ]);

      const assigned = myTickets.length;
      const open = allTickets.filter((t) => t.status === "open").length;
      const pending = allTickets.filter((t) => t.status === "pending").length;
      const closed = allTickets.filter((t) => t.status === "closed").length;

      setStats({ assigned, open, pending, closed });
      setRecentTickets(myTickets.slice(0, 5));
    } catch (err: any) {
      console.error("Failed to load dashboard data:", err);
      const errorMessage = err.response?.data?.error || err.message || "Failed to load dashboard data";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-gray-500">Loading your dashboard...</div>
          <div className="text-xs text-gray-400">Please wait while we fetch your data</div>
        </div>
      </div>
    );
  }

  const handleCreateTicket = () => {
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {user?.name}. Here's an overview of your ticket management activity.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 mb-1">Error loading dashboard</p>
              <p className="text-sm text-red-700 mb-3">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned to Me</CardTitle>
            <Ticket className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.assigned}</div>
            <p className="text-xs text-gray-500">
              {stats.assigned === 0
                ? "No tickets assigned to you"
                : stats.assigned === 1
                  ? "Ticket requires your attention"
                  : "Tickets require your attention"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.open}</div>
            <p className="text-xs text-gray-500">
              {stats.open === 0
                ? "All tickets are being handled"
                : "Tickets awaiting response"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tickets</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
            <p className="text-xs text-gray-500">
              {stats.pending === 0
                ? "No pending tickets"
                : "Awaiting customer response"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed Tickets</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.closed}</div>
            <p className="text-xs text-gray-500">
              {stats.closed === 0
                ? "No tickets closed yet"
                : "Successfully resolved"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Tickets</CardTitle>
            <p className="mt-1 text-xs text-gray-500">
              Your most recently assigned tickets
            </p>
          </CardHeader>
          <CardContent>
            {recentTickets.length === 0 ? (
              <div className="py-8 text-center">
                <Ticket className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 text-sm font-medium text-gray-900">
                  No tickets assigned yet
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Tickets assigned to you will appear here
                </p>
                <Link
                  href="/tickets"
                  className="mt-4 inline-block text-sm text-primary-600 hover:text-primary-700"
                >
                  Browse all tickets →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/tickets/${ticket.id}`}
                    className="block rounded-md border border-gray-200 p-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {ticket.parent_ticket_id && (
                            <GitBranch className="h-3 w-3 text-purple-500" />
                          )}
                          <p className={`text-sm font-medium ${ticket.parent_ticket_id ? "text-purple-700" : "text-gray-900"}`}>
                            {ticket.ticket_number}
                          </p>
                          {ticket.parent_ticket_id && (
                            <Badge variant="default" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                              Child
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 font-medium">{ticket.subject}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          ticket.status === "open"
                            ? "bg-blue-100 text-blue-800"
                            : ticket.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : ticket.status === "closed"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <Link href="/tickets" className="mt-4 block text-sm text-primary-600 hover:text-primary-700">
              View all tickets →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <p className="mt-1 text-xs text-gray-500">
              Common tasks to help you get started
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/tickets?assigned_to=me"
              className="block rounded-md border border-gray-200 p-3 text-sm transition-colors hover:bg-gray-50 hover:border-primary-300"
            >
              <div className="font-medium text-gray-900">View My Tickets</div>
              <div className="mt-0.5 text-xs text-gray-500">
                See all tickets assigned to you
              </div>
            </Link>
            <Link
              href="/tickets?status=open"
              className="block rounded-md border border-gray-200 p-3 text-sm transition-colors hover:bg-gray-50 hover:border-primary-300"
            >
              <div className="font-medium text-gray-900">View Open Tickets</div>
              <div className="mt-0.5 text-xs text-gray-500">
                Browse all open tickets that need attention
              </div>
            </Link>
            <Link
              href="/tickets?assigned_to=unassigned"
              className="block rounded-md border border-gray-200 p-3 text-sm transition-colors hover:bg-gray-50 hover:border-primary-300"
            >
              <div className="font-medium text-gray-900">View Unassigned Tickets</div>
              <div className="mt-0.5 text-xs text-gray-500">
                Find tickets that need assignment
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTicket}
        />
      )}
    </div>
  );
}
