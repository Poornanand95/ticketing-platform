"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ticketsApi } from "@/lib/api/tickets";
import { bucketsApi } from "@/lib/api/buckets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { format } from "date-fns";
import {
  Ticket as TicketIcon,
  Search,
  Filter,
  Info,
  Clock,
  User,
  AlertCircle,
  Tag,
  GitBranch,
  Plus,
} from "lucide-react";
import { CreateTicketModal } from "@/components/tickets/create-ticket-modal";
import type { Ticket, Bucket } from "@/types";

export default function TicketsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isUpdatingFromUrl = useRef(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: searchParams.get("status") || "",
    priority: searchParams.get("priority") || "",
    assigned_to: searchParams.get("assigned_to") || "",
    bucket_id: searchParams.get("bucket_id") || "",
    search: searchParams.get("search") || "",
  });
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [page, setPage] = useState(1);
  const limit = 50;
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (isUpdatingFromUrl.current) return;
    
    const status = searchParams.get("status") || "";
    const priority = searchParams.get("priority") || "";
    const assigned_to = searchParams.get("assigned_to") || "";
    const bucket_id = searchParams.get("bucket_id") || "";
    const search = searchParams.get("search") || "";
    
    const urlFilters = { status, priority, assigned_to, bucket_id, search };
    
    setFilters((prevFilters) => {
      const hasChanged = 
        urlFilters.status !== prevFilters.status ||
        urlFilters.priority !== prevFilters.priority ||
        urlFilters.assigned_to !== prevFilters.assigned_to ||
        urlFilters.bucket_id !== prevFilters.bucket_id ||
        urlFilters.search !== prevFilters.search;
      
      if (hasChanged) {
        isUpdatingFromUrl.current = true;
        setTimeout(() => {
          isUpdatingFromUrl.current = false;
        }, 100);
        return urlFilters;
      }
      return prevFilters;
    });
  }, [searchParams]);

  useEffect(() => {
    loadBuckets();
  }, []);

  useEffect(() => {
    loadTickets();
  }, [filters, page]);

  const loadBuckets = async () => {
    try {
      const data = await bucketsApi.list();
      setBuckets(data);
    } catch (err) {
      console.error("Failed to load buckets:", err);
    }
  };

  const loadTickets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = {
        limit,
        offset: (page - 1) * limit,
      };

      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.assigned_to) params.assigned_to = filters.assigned_to;
      if (filters.bucket_id) {
        params.bucket_id = filters.bucket_id === "null" ? null : filters.bucket_id;
      }

      const data = await ticketsApi.list(params);
      let filtered = data;

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = data.filter(
          (t) =>
            t.ticket_number.toLowerCase().includes(searchLower) ||
            t.subject.toLowerCase().includes(searchLower),
        );
      }

      setTickets(filtered);
    } catch (err: any) {
      console.error("Failed to load tickets:", err);
      const errorMessage = err.response?.data?.error || err.message || "Failed to load tickets. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setPage(1);
    
    const params = new URLSearchParams();
    Object.entries(updatedFilters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });
    
    const queryString = params.toString();
    const newUrl = queryString ? `/tickets?${queryString}` : "/tickets";
    
    setTimeout(() => {
      router.push(newUrl, { scroll: false });
    }, 0);
  };

  const handleSearchChange = (value: string) => {
    setFilters((prevFilters) => ({ ...prevFilters, search: value }));
    setPage(1);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isUpdatingFromUrl.current && filters.search !== undefined) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, val]) => {
          if (val) {
            params.append(key, val);
          }
        });
        const queryString = params.toString();
        const currentQuery = searchParams.toString();
        
        if (queryString !== currentQuery) {
          const newUrl = queryString ? `/tickets?${queryString}` : "/tickets";
          router.push(newUrl, { scroll: false });
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters.search, router, searchParams]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "info";
      case "pending":
        return "warning";
      case "resolved":
        return "success";
      case "closed":
        return "success";
      default:
        return "default";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "error";
      case "high":
        return "warning";
      case "medium":
        return "info";
      case "low":
        return "default";
      default:
        return "default";
    }
  };

  const handleCreateTicket = () => {
    loadTickets();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tickets</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track all support tickets. Use filters to find specific tickets quickly.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 mb-6">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 mb-1">
              Quick Tips
            </p>
            <p className="text-sm text-blue-700">
              Use the search bar to find tickets by number or subject. Filter by status to see tickets needing attention, or by priority to focus on urgent issues. Click any ticket to view details and respond.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <CardTitle>Filters</CardTitle>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Filter tickets by status, priority, assignment, or search by ticket number or subject
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <Input
                label="Search"
                placeholder="Search by ticket number or subject..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 flex items-center space-x-1 text-sm font-medium text-gray-700">
                <Clock className="h-4 w-4" />
                <span>Status</span>
              </label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={filters.status}
                onChange={(e) => updateFilters({ status: e.target.value })}
              >
                <option value="">All Status</option>
                <option value="open">Open - Needs attention</option>
                <option value="pending">Pending - Awaiting response</option>
                <option value="resolved">Resolved - Issue fixed</option>
                <option value="closed">Closed - Completed</option>
              </select>
            </div>
            <div>
              <label className="mb-1 flex items-center space-x-1 text-sm font-medium text-gray-700">
                <AlertCircle className="h-4 w-4" />
                <span>Priority</span>
              </label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={filters.priority}
                onChange={(e) => updateFilters({ priority: e.target.value })}
              >
                <option value="">All Priority</option>
                <option value="low">Low - General inquiry</option>
                <option value="medium">Medium - Standard request</option>
                <option value="high">High - Important issue</option>
                <option value="urgent">Urgent - Critical</option>
              </select>
            </div>
            <div>
              <label className="mb-1 flex items-center space-x-1 text-sm font-medium text-gray-700">
                <Tag className="h-4 w-4" />
                <span>Bucket</span>
              </label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={filters.bucket_id}
                onChange={(e) => updateFilters({ bucket_id: e.target.value })}
              >
                <option value="">All Buckets</option>
                <option value="null">No Bucket</option>
                {buckets.map((bucket) => (
                  <option key={bucket.id} value={bucket.id}>
                    {bucket.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 flex items-center space-x-1 text-sm font-medium text-gray-700">
                <User className="h-4 w-4" />
                <span>Assignment</span>
              </label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={filters.assigned_to}
                onChange={(e) => updateFilters({ assigned_to: e.target.value })}
              >
                <option value="">All Assignments</option>
                <option value="me">Assigned to Me</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 mb-1">Error loading tickets</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Tickets {tickets.length > 0 && `(${tickets.length})`}
          </CardTitle>
          {tickets.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              Click on any ticket to view details and manage it
            </p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="mb-2 text-gray-500">Loading tickets...</div>
              <div className="text-xs text-gray-400">
                Please wait while we fetch your tickets
              </div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-12 text-center">
              <TicketIcon className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm font-medium text-gray-900">
                No tickets found
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {filters.search || filters.status || filters.priority || filters.assigned_to
                  ? "Try adjusting your filters to see more results"
                  : "No tickets have been created yet. New tickets will appear here."}
              </p>
              {(filters.search || filters.status || filters.priority || filters.assigned_to) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setFilters({ status: "", priority: "", assigned_to: "", search: "" });
                    setPage(1);
                    router.push("/tickets", { scroll: false });
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className={`block rounded-lg border p-4 transition-all hover:shadow-md ${
                    ticket.parent_ticket_id
                      ? "border-purple-200 bg-purple-50 hover:border-purple-300"
                      : "border-gray-200 bg-white hover:border-primary-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        {ticket.parent_ticket_id && (
                          <GitBranch className="h-4 w-4 text-purple-500" />
                        )}
                        <span className={`font-mono text-sm font-semibold ${ticket.parent_ticket_id ? "text-purple-700" : "text-gray-900"}`}>
                          {ticket.ticket_number}
                        </span>
                        {ticket.parent_ticket_id && (
                          <Badge variant="default" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                            Child
                          </Badge>
                        )}
                        <Badge variant={getStatusColor(ticket.status) as any}>
                          {ticket.status}
                        </Badge>
                        <Badge variant={getPriorityColor(ticket.priority) as any}>
                          {ticket.priority}
                        </Badge>
                        {!ticket.assigned_to && (
                          <Badge variant="warning" className="text-xs">
                            Unassigned
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
                        {ticket.subject}
                      </h3>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(ticket.created_at), "MMM d, yyyy")}
                        </span>
                        {ticket.assigned_to && (
                          <span className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            Assigned
                          </span>
                        )}
                        {ticket.required_skill && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                            {ticket.required_skill}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTicket}
        />
      )}
    </div>
  );
}
