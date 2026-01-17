"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ticketsApi } from "@/lib/api/tickets";
import { usersApi } from "@/lib/api/users";
import { bucketsApi } from "@/lib/api/buckets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  ArrowLeft,
  Send,
  MessageSquare,
  Info,
  Settings,
  User as UserIcon,
  Clock,
  Tag,
  AlertCircle,
  Eye,
  Plus,
  GitBranch,
  Link as LinkIcon,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth/store";
import { useNotification } from "@/hooks/use-notification";
import type { Ticket, TicketMessage, User, Bucket } from "@/types";

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const notification = useNotification();
  const ticketId = params.id as string;
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles?.includes("admin") ?? false;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [agents, setAgents] = useState<User[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [observers, setObservers] = useState<string[]>([]);
  const [isUpdatingObservers, setIsUpdatingObservers] = useState(false);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [showCreateChildModal, setShowCreateChildModal] = useState(false);
  const [showSetParentModal, setShowSetParentModal] = useState(false);
  const [newChildSubject, setNewChildSubject] = useState("");
  const [newChildPriority, setNewChildPriority] = useState("medium");
  const [isCreatingChild, setIsCreatingChild] = useState(false);

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    setIsLoading(true);
    try {
      const data = await ticketsApi.getById(ticketId);
      setTicket(data);
      setMessages(data.messages || []);
      setObservers(data.observers || []);

      if (isAdmin) {
        try {
          const skill = data.required_skill;
          const [agentList, bucketList, userList, ticketList] = await Promise.all([
            usersApi.getAgents(skill ? { skill } : undefined),
            bucketsApi.list(),
            usersApi.getAgents(),
            ticketsApi.list({ limit: 1000 }),
          ]);
          setAgents(agentList);
          setBuckets(bucketList);
          setAllUsers(userList);
          
          const ticketsWithChildren = new Set<string>();
          ticketList.forEach((t) => {
            if (t.parent_ticket_id) {
              ticketsWithChildren.add(t.parent_ticket_id);
            }
          });
          
          const availableForParent = ticketList.filter((t) => {
            if (t.id === ticketId) return false;
            if (t.parent_ticket_id) return false;
            if (ticketsWithChildren.has(t.id)) return false;
            return true;
          });
          setAllTickets(availableForParent);
        } catch (error) {
          console.error("Failed to load agents, buckets, or users:", error);
          setAgents([]);
          setBuckets([]);
          setAllUsers([]);
        }
      }
    } catch (error) {
      console.error("Failed to load ticket:", error);
      notification.error("Failed to load ticket");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      const message = await ticketsApi.addMessage(ticketId, {
        content: newMessage,
        is_private: isPrivate,
      });
      setMessages([...messages, message]);
      setNewMessage("");
      setIsPrivate(false);
      notification.success("Message sent successfully");
    } catch (error) {
      console.error("Failed to send message:", error);
      notification.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      const updated = await ticketsApi.update(ticketId, { status: status as any });
      setTicket(updated);
      setObservers(updated.observers || []);
      notification.success(`Ticket status updated to ${status}`);
    } catch (error) {
      console.error("Failed to update ticket:", error);
      notification.error("Failed to update ticket status");
    }
  };

  const handleUpdatePriority = async (priority: string) => {
    try {
      const updated = await ticketsApi.update(ticketId, { priority: priority as any });
      setTicket(updated);
      setObservers(updated.observers || []);
      notification.success(`Ticket priority updated to ${priority}`);
    } catch (error) {
      console.error("Failed to update ticket:", error);
      notification.error("Failed to update ticket priority");
    }
  };

  const handleAssign = async (assignedTo: string | null) => {
    setIsAssigning(true);
    try {
      const updated = await ticketsApi.update(ticketId, { assigned_to: assignedTo });
      setTicket(updated);
      setObservers(updated.observers || []);
      notification.success(
        assignedTo ? "Ticket assigned successfully" : "Ticket unassigned"
      );
    } catch (error) {
      console.error("Failed to assign ticket:", error);
      notification.error("Failed to assign ticket");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdateObservers = async (selectedUserIds: string[]) => {
    setIsUpdatingObservers(true);
    try {
      await ticketsApi.setObservers(ticketId, selectedUserIds);
      setObservers(selectedUserIds);
      if (ticket) {
        setTicket({ ...ticket, observers: selectedUserIds });
      }
      notification.success("Observers updated successfully");
    } catch (error) {
      console.error("Failed to update observers:", error);
      notification.error("Failed to update observers");
    } finally {
      setIsUpdatingObservers(false);
    }
  };

  const handleCreateChild = async () => {
    if (!newChildSubject.trim()) {
      notification.error("Subject is required");
      return;
    }

    setIsCreatingChild(true);
    try {
      const childTicket = await ticketsApi.createChild(ticketId, {
        subject: newChildSubject,
        priority: newChildPriority,
        source: "web",
      });
      await loadTicket();
      setShowCreateChildModal(false);
      setNewChildSubject("");
      setNewChildPriority("medium");
      notification.success("Child ticket created successfully");
      router.push(`/tickets/${childTicket.id}`);
    } catch (error) {
      console.error("Failed to create child ticket:", error);
      notification.error("Failed to create child ticket");
    } finally {
      setIsCreatingChild(false);
    }
  };

  const handleSetParent = async (parentTicketId: string | null) => {
    try {
      const updated = await ticketsApi.update(ticketId, {
        parent_ticket_id: parentTicketId,
      });
      setTicket(updated);
      setObservers(updated.observers || []);
      setShowSetParentModal(false);
      notification.success("Parent ticket updated successfully");
      await loadTicket();
    } catch (error) {
      console.error("Failed to set parent ticket:", error);
      notification.error("Failed to set parent ticket");
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="mb-2 text-gray-500">Loading ticket details...</div>
          <div className="text-xs text-gray-400">Please wait while we fetch the ticket information</div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-sm font-medium text-gray-900">Ticket not found</p>
          <p className="mt-1 text-sm text-gray-500">The ticket you're looking for doesn't exist</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => router.push("/tickets")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              {ticket.parent_ticket_id && (
                <GitBranch className="h-6 w-6 text-purple-500" />
              )}
              <h1 className={`text-3xl font-bold ${ticket.parent_ticket_id ? "text-purple-700" : "text-gray-900"}`}>
                {ticket.ticket_number}
              </h1>
              {ticket.parent_ticket_id && (
                <Badge variant="default" className="bg-purple-100 text-purple-700 border-purple-300">
                  Child Ticket
                </Badge>
              )}
              <Badge variant={getStatusColor(ticket.status) as any}>{ticket.status}</Badge>
              <Badge variant={getPriorityColor(ticket.priority) as any}>{ticket.priority}</Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500">{ticket.subject}</p>
            {ticket.parent && (
              <div className="mt-2 flex items-center space-x-2 text-sm">
                <LinkIcon className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Parent:</span>
                <button
                  onClick={() => router.push(`/tickets/${ticket.parent!.id}`)}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  {ticket.parent.ticket_number}
                </button>
              </div>
            )}
            {ticket.children && ticket.children.length > 0 && (
              <div className="mt-2 flex items-center space-x-2 text-sm">
                <GitBranch className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">
                  {ticket.children.length} child ticket{ticket.children.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {messages.length === 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 mb-1">No messages yet</p>
              <p className="text-sm text-blue-700">
                This ticket has no conversation history. Start by sending a reply to the customer below.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-gray-500" />
                  <CardTitle>Conversation</CardTitle>
                </div>
                {messages.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {messages.length} {messages.length === 1 ? "message" : "messages"}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-4 text-sm font-medium text-gray-900">No messages yet</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Start the conversation by sending a reply below
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-lg border p-4 transition-colors ${
                        message.is_private
                          ? "border-yellow-300 bg-yellow-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {message.is_private && (
                            <span className="text-yellow-600" title="Private note">
                              🔒
                            </span>
                          )}
                          <span className="text-sm font-semibold text-gray-900">
                            User {message.user_id.slice(0, 8)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(message.created_at), "MMM d, yyyy HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {(ticket.parent || (ticket.children && ticket.children.length > 0)) && (
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <GitBranch className="h-5 w-5 text-gray-500" />
                  <CardTitle>Related Tickets</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticket.parent && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Parent Ticket
                    </p>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <button
                            onClick={() => router.push(`/tickets/${ticket.parent!.id}`)}
                            className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                          >
                            {ticket.parent.ticket_number}
                          </button>
                          <p className="text-sm text-gray-700 mt-1">{ticket.parent.subject}</p>
                        </div>
                        <Badge variant={getStatusColor(ticket.parent.status) as any}>
                          {ticket.parent.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
                {ticket.children && ticket.children.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Child Tickets ({ticket.children.length})
                      </p>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCreateChildModal(true)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Create Child
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {ticket.children.map((child) => (
                        <div
                          key={child.id}
                          className="rounded-lg border border-purple-200 bg-purple-50 p-3 hover:border-purple-300 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <GitBranch className="h-4 w-4 text-purple-500" />
                                <button
                                  onClick={() => router.push(`/tickets/${child.id}`)}
                                  className="text-sm font-semibold text-purple-700 hover:text-purple-800"
                                >
                                  {child.ticket_number}
                                </button>
                                <Badge variant="default" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                                  Child
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-700 mt-1">{child.subject}</p>
                            </div>
                            <Badge variant={getStatusColor(child.status) as any}>
                              {child.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isAdmin && !ticket.parent && (
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <GitBranch className="h-5 w-5 text-gray-500" />
                  <CardTitle>Child Tickets</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateChildModal(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Child Ticket
                </Button>
                <p className="mt-2 text-xs text-gray-500">
                  Create a related ticket that will be linked as a child of this ticket.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Send className="h-5 w-5 text-gray-500" />
                <CardTitle>Reply</CardTitle>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Send a message to the customer. Use private notes for internal team communication.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendMessage} className="space-y-4">
                <textarea
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  rows={5}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your response here... Be clear and helpful in your communication."
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">
                      Private note (visible only to agents)
                    </span>
                  </label>
                  <Button type="submit" isLoading={isSending} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    {isSending ? "Sending..." : "Send Reply"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-gray-500" />
                <CardTitle>Ticket Properties</CardTitle>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Manage ticket status, priority, and assignment
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                  <Tag className="h-4 w-4" />
                  <span>Status</span>
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={ticket.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                >
                  <option value="open">Open - Active ticket</option>
                  <option value="pending">Pending - Awaiting response</option>
                  <option value="resolved">Resolved - Issue fixed</option>
                  <option value="closed">Closed - Completed</option>
                </select>
              </div>
              <div>
                <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>Priority</span>
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={ticket.priority}
                  onChange={(e) => handleUpdatePriority(e.target.value)}
                >
                  <option value="low">Low - General inquiry</option>
                  <option value="medium">Medium - Standard request</option>
                  <option value="high">High - Important issue</option>
                  <option value="urgent">Urgent - Critical</option>
                </select>
              </div>
              {isAdmin && (
                <>
                  <div>
                    <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                      <Tag className="h-4 w-4" />
                      <span>Required Skill</span>
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={ticket.required_skill || ""}
                      onChange={async (e) => {
                        const value = e.target.value.trim() || null;
                        try {
                          const updated = await ticketsApi.update(ticketId, {
                            required_skill: value,
                          });
                          setTicket(updated);
                          setObservers(updated.observers || []);
                          try {
                            if (value) {
                              const agentList = await usersApi.getAgents({ skill: value });
                              setAgents(agentList);
                            } else {
                              const agentList = await usersApi.getAgents();
                              setAgents(agentList);
                            }
                          } catch (agentError) {
                            console.error("Failed to load agents:", agentError);
                            notification.error("Skill updated but failed to refresh agent list");
                          }
                          notification.success("Required skill updated");
                        } catch (error) {
                          console.error("Failed to update required skill:", error);
                          notification.error("Failed to update required skill");
                        }
                      }}
                      placeholder="e.g., Sales, Billing, Technical Support"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Set a skill requirement. Only agents with matching skills will appear in the assignment dropdown.
                    </p>
                  </div>
                  <div>
                    <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                      <UserIcon className="h-4 w-4" />
                      <span>Assign to Agent</span>
                    </label>
                    <select
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
                      value={ticket.assigned_to || ""}
                      onChange={(e) =>
                        handleAssign(e.target.value ? e.target.value : null)
                      }
                      disabled={isAssigning}
                    >
                      <option value="">Unassigned</option>
                      {agents.length === 0 ? (
                        <option value="" disabled>
                          No agents available
                        </option>
                      ) : (
                        agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name} {agent.skills && agent.skills.length > 0 && `(${agent.skills.join(", ")})`}
                          </option>
                        ))
                      )}
                    </select>
                    {ticket.required_skill && agents.length > 0 && (
                      <p className="mt-1 text-xs text-green-600">
                        ✓ Showing {agents.length} agent{agents.length !== 1 ? "s" : ""} with skill: {ticket.required_skill}
                      </p>
                    )}
                    {ticket.required_skill && agents.length === 0 && (
                      <p className="mt-1 text-xs text-yellow-600">
                        ⚠ No active agents found with skill: {ticket.required_skill}. You can still assign manually or update the skill requirement.
                      </p>
                    )}
                    {!ticket.required_skill && agents.length === 0 && (
                      <p className="mt-1 text-xs text-gray-500">
                        Loading available agents...
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                      <Tag className="h-4 w-4" />
                      <span>Bucket</span>
                    </label>
                    <select
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={ticket.bucket_id || ""}
                      onChange={async (e) => {
                        const value = e.target.value.trim() || null;
                        try {
                          const updated = await ticketsApi.update(ticketId, {
                            bucket_id: value,
                          });
                          setTicket(updated);
                          setObservers(updated.observers || []);
                          notification.success("Bucket updated");
                        } catch (error) {
                          console.error("Failed to update bucket:", error);
                          notification.error("Failed to update bucket");
                        }
                      }}
                    >
                      <option value="">No Bucket</option>
                      {buckets.map((bucket) => (
                        <option key={bucket.id} value={bucket.id}>
                          {bucket.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Categorize this ticket by moving it to a bucket.
                    </p>
                  </div>
                  <div>
                    <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-2">
                      <Eye className="h-4 w-4" />
                      <span>Observers</span>
                      {observers.length > 0 && (
                        <Badge variant="info" className="ml-2 text-xs">
                          {observers.length} selected
                        </Badge>
                      )}
                    </label>
                    <p className="mb-3 text-xs text-gray-500">
                      Select users who should observe this ticket. Observers will receive notifications about ticket updates.
                    </p>
                    {allUsers.length === 0 ? (
                      <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-center">
                        <p className="text-sm text-gray-500">Loading users...</p>
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto rounded-md border border-gray-300 bg-white p-2 space-y-2">
                        {allUsers.map((user) => {
                          const isSelected = observers.includes(user.id);
                          return (
                            <label
                              key={user.id}
                              className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1.5 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  const newObservers = isSelected
                                    ? observers.filter((id) => id !== user.id)
                                    : [...observers, user.id];
                                  handleUpdateObservers(newObservers);
                                }}
                                disabled={isUpdatingObservers}
                                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-900">{user.name}</span>
                                <span className="text-xs text-gray-500 ml-2">{user.email}</span>
                              </div>
                              {user.roles && user.roles.length > 0 && (
                                <Badge variant="default" className="text-xs">
                                  {user.roles[0]}
                                </Badge>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {observers.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-2">Selected observers:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {observers.map((observerId) => {
                            const user = allUsers.find((u) => u.id === observerId);
                            return user ? (
                              <Badge
                                key={observerId}
                                variant="info"
                                className="text-xs flex items-center space-x-1"
                              >
                                <span>{user.name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newObservers = observers.filter((id) => id !== observerId);
                                    handleUpdateObservers(newObservers);
                                  }}
                                  disabled={isUpdatingObservers}
                                  className="ml-1 hover:text-red-600 disabled:opacity-50"
                                  title="Remove observer"
                                >
                                  ×
                                </button>
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
              {!isAdmin && (
                <>
                  {ticket.required_skill && (
                    <div>
                      <p className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                        <Tag className="h-4 w-4" />
                        <span>Required Skill</span>
                      </p>
                      <Badge variant="info">{ticket.required_skill}</Badge>
                    </div>
                  )}
                  {ticket.bucket_id && (
                    <div>
                      <p className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                        <Tag className="h-4 w-4" />
                        <span>Bucket</span>
                      </p>
                      <Badge variant="info">
                        {buckets.find((b) => b.id === ticket.bucket_id)?.name || "Unknown"}
                      </Badge>
                    </div>
                  )}
                </>
              )}
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <div>
                  <p className="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    <Tag className="h-3 w-3" />
                    <span>Ticket Number</span>
                  </p>
                  <p className="text-sm text-gray-900 font-mono">{ticket.ticket_number}</p>
                </div>
                <div>
                  <p className="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    <Tag className="h-3 w-3" />
                    <span>Source</span>
                  </p>
                  <Badge variant="info" className="capitalize">{ticket.source}</Badge>
                </div>
                <div>
                  <p className="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    <Clock className="h-3 w-3" />
                    <span>Created</span>
                  </p>
                  <p className="text-sm text-gray-900">
                    {format(new Date(ticket.created_at), "MMM d, yyyy 'at' HH:mm")}
                  </p>
                </div>
                <div>
                  <p className="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    <Clock className="h-3 w-3" />
                    <span>Last Updated</span>
                  </p>
                  <p className="text-sm text-gray-900">
                    {format(new Date(ticket.updated_at), "MMM d, yyyy 'at' HH:mm")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showCreateChildModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create Child Ticket</CardTitle>
              <p className="mt-1 text-xs text-gray-500">
                Create a new ticket that will be linked as a child of {ticket.ticket_number}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={newChildSubject}
                  onChange={(e) => setNewChildSubject(e.target.value)}
                  placeholder="Enter child ticket subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={newChildPriority}
                  onChange={(e) => setNewChildPriority(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateChildModal(false);
                    setNewChildSubject("");
                    setNewChildPriority("medium");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateChild} isLoading={isCreatingChild}>
                  Create Child Ticket
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showSetParentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Set Parent Ticket</CardTitle>
              <p className="mt-1 text-xs text-gray-500">
                Link this ticket to a parent ticket
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Parent Ticket
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={ticket.parent_ticket_id || ""}
                  onChange={(e) => {
                    const value = e.target.value.trim() || null;
                    handleSetParent(value);
                  }}
                >
                  <option value="">No Parent</option>
                  {allTickets.length === 0 ? (
                    <option value="" disabled>
                      No available tickets (all tickets already have parents or children)
                    </option>
                  ) : (
                    allTickets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.ticket_number} - {t.subject}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowSetParentModal(false)}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
