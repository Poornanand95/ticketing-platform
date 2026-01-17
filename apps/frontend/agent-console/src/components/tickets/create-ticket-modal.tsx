"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotification } from "@/hooks/use-notification";
import { ticketsApi } from "@/lib/api/tickets";
import { bucketsApi } from "@/lib/api/buckets";
import { usersApi } from "@/lib/api/users";
import { useRouter } from "next/navigation";
import { X, AlertCircle } from "lucide-react";
import type { Bucket, User } from "@/types";

interface CreateTicketModalProps {
  onClose: () => void;
  onCreate: () => void;
}

export function CreateTicketModal({ onClose, onCreate }: CreateTicketModalProps) {
  const notification = useNotification();
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [requiredSkill, setRequiredSkill] = useState("");
  const [bucketId, setBucketId] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [bucketsData, agentsData] = await Promise.all([
          bucketsApi.list(),
          usersApi.getAgents(),
        ]);
        setBuckets(bucketsData);
        setAgents(agentsData);
      } catch (err) {
        console.error("Failed to load buckets or agents:", err);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!subject.trim()) {
      setError("Subject is required");
      return;
    }

    setIsLoading(true);

    try {
      const ticket = await ticketsApi.create({
        subject: subject.trim(),
        priority,
        source: "web",
        required_skill: requiredSkill.trim() || null,
        bucket_id: bucketId || null,
        assigned_to: assignedTo || null,
        metadata: description ? { description } : undefined,
      });

      if (description.trim()) {
        await ticketsApi.addMessage(ticket.id, {
          content: description.trim(),
          is_private: false,
        });
      }

      notification.success("Ticket created successfully!");
      onCreate();
      onClose();
      router.push(`/tickets/${ticket.id}`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || "Failed to create ticket.";
      setError(errorMessage);
      notification.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4 sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create New Ticket</h2>
            <p className="mt-1 text-sm text-gray-500">
              Create a new support ticket for your organization.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5 text-gray-500" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          )}

          <div>
            <Input
              label="Subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder="Brief summary of the issue"
              disabled={isLoading}
              helperText="A brief summary of the ticket (e.g., 'Unable to process payment')"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={5}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional detailed description. This will be added as the first message.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as "low" | "medium" | "high" | "urgent")
                }
                disabled={isLoading}
              >
                <option value="low">Low - General inquiry</option>
                <option value="medium">Medium - Standard request</option>
                <option value="high">High - Important issue</option>
                <option value="urgent">Urgent - Critical</option>
              </select>
            </div>

            <div>
              <Input
                label="Required Skill"
                type="text"
                value={requiredSkill}
                onChange={(e) => setRequiredSkill(e.target.value)}
                placeholder="e.g., technical-support, billing"
                disabled={isLoading}
                helperText="Optional skill tag for routing"
              />
            </div>
          </div>

          {!isLoadingData && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bucket
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
                  value={bucketId}
                  onChange={(e) => setBucketId(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">No Bucket</option>
                  {buckets.map((bucket) => (
                    <option key={bucket.id} value={bucket.id}>
                      {bucket.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Optional bucket for ticket categorization
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign To
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">Unassigned</option>
                  {agents
                    .filter((agent) => agent.is_active)
                    .map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.email})
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Optional agent assignment
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose} type="button" disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading} disabled={isLoading || !subject.trim()}>
              {isLoading ? "Creating..." : "Create Ticket"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

