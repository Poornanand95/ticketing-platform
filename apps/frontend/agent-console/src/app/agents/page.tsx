"use client";

import { useState, useEffect } from "react";
import { usersApi } from "@/lib/api/users";
import type { User } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditAgentModal } from "@/components/agents/edit-agent-modal";
import { Users, UserPlus, AlertCircle } from "lucide-react";

export default function AgentsPage() {
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingAgent, setEditingAgent] = useState<User | null>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersApi.getAgents();
      setAgents(data);
    } catch (err: any) {
      console.error("Failed to load agents:", err);
      const errorMessage = err.response?.data?.error || err.message || "Failed to load agents. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    await loadAgents();
    setEditingAgent(null);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <div className="mb-2 text-gray-500">Loading agents...</div>
          <div className="text-xs text-gray-400">
            Please wait while we fetch agent information
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Agents</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your support team agents. Assign skills and control agent availability.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            All Agents {agents.length > 0 && `(${agents.length})`}
          </CardTitle>
          <p className="mt-1 text-xs text-gray-500">
            Click Edit to manage agent skills and active status. Only active agents with matching skills will be assigned to tickets.
          </p>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="py-12 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-300" />
              <p className="mt-4 text-sm font-medium text-gray-900">
                Error loading agents
              </p>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={loadAgents}
              >
                Try Again
              </Button>
            </div>
          ) : agents.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm font-medium text-gray-900">
                No agents found
              </p>
              <p className="mt-1 text-sm text-gray-500">
                There are no agents in your organization yet. Agents will appear here once they are created.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Skills
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr
                      key={agent.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {agent.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {agent.email}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {agent.skills && agent.skills.length > 0 ? (
                            agent.skills.map((skill) => (
                              <Badge key={skill} variant="info">
                                {skill}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-gray-400">
                              No skills
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={agent.is_active ? "success" : "default"}>
                          {agent.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingAgent(agent)}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {editingAgent && (
        <EditAgentModal
          agent={editingAgent}
          onClose={() => setEditingAgent(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}

