"use client";

import { useState, useEffect } from "react";
import { usersApi } from "@/lib/api/users";
import type { User } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EditAgentModalProps {
  agent: User;
  onClose: () => void;
  onUpdate: () => void;
}

const AVAILABLE_SKILLS = [
  "Technical Support",
  "Billing",
  "Sales",
  "Product Questions",
  "Account Management",
  "Escalation",
  "General Inquiry",
];

export function EditAgentModal({
  agent,
  onClose,
  onUpdate,
}: EditAgentModalProps) {
  const [skills, setSkills] = useState<string[]>(agent.skills || []);
  const [isActive, setIsActive] = useState(agent.is_active ?? true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : [...prev, skill],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await usersApi.updateAgent(agent.id, {
        skills,
        is_active: isActive,
      });
      onUpdate();
    } catch (err: any) {
      let errorMessage = "Failed to update agent. Please try again.";
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.code === "ECONNREFUSED" || err.code === "ERR_NETWORK") {
        errorMessage = "Unable to connect to server. Please ensure the API Gateway is running.";
      }
      
      console.error("Update agent error:", err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Edit Agent: {agent.name}</CardTitle>
          <p className="mt-1 text-xs text-gray-500">
            Manage agent skills and status. Only active agents with matching skills will be assigned to tickets.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                <p className="font-medium">Error updating agent</p>
                <p className="mt-1">{error}</p>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Skills
              </label>
              <p className="mb-3 text-xs text-gray-500">
                Select the skills this agent specializes in. Tickets with matching required skills will be assigned to this agent.
              </p>
              <div className="space-y-2">
                {AVAILABLE_SKILLS.map((skill) => (
                  <label
                    key={skill}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={skills.includes(skill)}
                      onChange={() => toggleSkill(skill)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{skill}</span>
                  </label>
                ))}
              </div>
              {skills.length === 0 && (
                <div className="mt-3 rounded-md bg-yellow-50 border border-yellow-200 p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> No skills selected. This agent won't be automatically assigned to tickets with required skills.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Status
              </label>
              <p className="mb-3 text-xs text-gray-500">
                Control whether this agent is active and available for ticket assignments.
              </p>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={isActive}
                    onChange={() => setIsActive(true)}
                    className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!isActive}
                    onChange={() => setIsActive(false)}
                    className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Inactive</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading}>
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

