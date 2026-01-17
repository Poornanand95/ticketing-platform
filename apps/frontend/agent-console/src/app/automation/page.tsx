"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, Edit, Trash2, ToggleLeft, ToggleRight, Settings, AlertCircle } from "lucide-react";
import { automationApi } from "@/lib/api/automation";
import { useAuthStore } from "@/lib/auth/store";
import { useNotification } from "@/hooks/use-notification";
import type { AutomationRule } from "@/types";
import { AutomationForm } from "@/components/automation/automation-form";

export default function AutomationPage() {
  const { user } = useAuthStore();
  const notification = useNotification();
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  useEffect(() => {
    if (user?.org_id) {
      loadAutomations();
    }
  }, [user?.org_id]);

  const loadAutomations = async () => {
    if (!user?.org_id) return;

    setIsLoading(true);
    try {
      const [allRules, defaults] = await Promise.all([
        automationApi.list(user.org_id),
        automationApi.getDefaults(user.org_id),
      ]);

      // Merge defaults and custom rules, ensuring defaults are marked
      const defaultsMap = new Map(defaults.map((r) => [r.id, r]));
      const merged = allRules.map((rule) => ({
        ...rule,
        is_default: defaultsMap.has(rule.id) || rule.is_default,
      }));

      setAutomations(merged.sort((a, b) => b.priority - a.priority));
    } catch (error) {
      console.error("Failed to load automations:", error);
      notification.error("Failed to load automation rules");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (rule: AutomationRule) => {
    if (!user?.org_id) return;

    setIsToggling(rule.id);
    try {
      const updated = await automationApi.toggle(rule.id, !rule.enabled);
      setAutomations((prev) =>
        prev.map((r) => (r.id === rule.id ? updated : r))
      );
      notification.success(
        `Automation ${updated.enabled ? "enabled" : "disabled"}`
      );
    } catch (error) {
      console.error("Failed to toggle automation:", error);
      notification.error("Failed to toggle automation");
    } finally {
      setIsToggling(null);
    }
  };

  const handleDelete = async (rule: AutomationRule) => {
    if (!user?.org_id) return;
    if (rule.is_default) {
      notification.error("Default automations cannot be deleted");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${rule.name}"?`)) {
      return;
    }

    try {
      await automationApi.delete(rule.id);
      setAutomations((prev) => prev.filter((r) => r.id !== rule.id));
      notification.success("Automation deleted");
    } catch (error) {
      console.error("Failed to delete automation:", error);
      notification.error("Failed to delete automation");
    }
  };

  const handleCreate = () => {
    setEditingRule(null);
    setShowCreateModal(true);
  };

  const handleEdit = (rule: AutomationRule) => {
    setEditingRule(rule);
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    setShowCreateModal(false);
    setEditingRule(null);
    await loadAutomations();
  };

  const handleInitializeDefaults = async () => {
    if (!user?.org_id) return;

    try {
      await automationApi.initializeDefaults(user.org_id);
      notification.success("Default automations initialized");
      await loadAutomations();
    } catch (error) {
      console.error("Failed to initialize defaults:", error);
      notification.error("Failed to initialize default automations");
    }
  };

  const getOperatorLabel = (operator: string) => {
    const labels: Record<string, string> = {
      equals: "equals",
      not_equals: "not equals",
      contains: "contains",
      starts_with: "starts with",
      ends_with: "ends with",
      greater_than: "greater than",
      less_than: "less than",
      in: "in",
      is_null: "is null",
      is_not_null: "is not null",
    };
    return labels[operator] || operator;
  };

  const getActionLabel = (type: string) => {
    const labels: Record<string, string> = {
      assign_agent: "Assign Agent",
      set_priority: "Set Priority",
      assign_to_bucket: "Assign to Bucket",
      add_observer: "Add Observer",
      escalate: "Escalate",
      close_ticket: "Close Ticket",
      send_notification: "Send Notification",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="mb-2 text-gray-500">Loading automations...</div>
        </div>
      </div>
    );
  }

  const defaultAutomations = automations.filter((r) => r.is_default);
  const customAutomations = automations.filter((r) => !r.is_default);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Automation Rules</h1>
          <p className="mt-1 text-sm text-gray-500">
            Automate ticket processing with rules that trigger actions based on conditions.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {defaultAutomations.length === 0 && (
            <Button variant="outline" onClick={handleInitializeDefaults}>
              <Settings className="mr-2 h-4 w-4" />
              Initialize Defaults
            </Button>
          )}
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Rule
          </Button>
        </div>
      </div>

      {defaultAutomations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span>Default Automations</span>
            </CardTitle>
            <p className="mt-1 text-xs text-gray-500">
              Pre-configured automation rules that can be toggled on or off
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {defaultAutomations.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {rule.name}
                        </h3>
                        <Badge variant="default" className="text-xs">
                          Default
                        </Badge>
                        <Badge
                          variant={rule.enabled ? "default" : "warning"}
                          className="text-xs"
                        >
                          {rule.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                        <Badge variant="info" className="text-xs">
                          Priority: {rule.priority}
                        </Badge>
                      </div>

                      <div className="mt-2 space-y-1">
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Conditions:</span>{" "}
                          {rule.conditions.map((cond, idx) => (
                            <span key={idx}>
                              {cond.field} {getOperatorLabel(cond.operator)}{" "}
                              {cond.value !== null && cond.value !== undefined
                                ? String(cond.value)
                                : ""}
                              {idx < rule.conditions.length - 1 && " AND "}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Actions:</span>{" "}
                          {rule.actions.map((action, idx) => (
                            <span key={idx}>
                              {getActionLabel(action.type)}
                              {idx < rule.actions.length - 1 && ", "}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="ml-4 flex items-center space-x-2">
                      <button
                        onClick={() => handleToggle(rule)}
                        disabled={isToggling === rule.id}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        title={rule.enabled ? "Disable" : "Enable"}
                      >
                        {rule.enabled ? (
                          <ToggleRight className="h-6 w-6 text-primary-600" />
                        ) : (
                          <ToggleLeft className="h-6 w-6" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(rule)}
                        className="text-gray-400 hover:text-primary-600"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Custom Automations</CardTitle>
            <p className="mt-1 text-xs text-gray-500">
              Your custom automation rules
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Rule
          </Button>
        </CardHeader>
        <CardContent>
          {customAutomations.length === 0 ? (
            <div className="py-12 text-center">
              <Zap className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm font-medium text-gray-900">
                No custom automations yet
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Create your first automation rule to get started
              </p>
              <Button className="mt-4" onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {customAutomations.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {rule.name}
                        </h3>
                        <Badge
                          variant={rule.enabled ? "default" : "warning"}
                          className="text-xs"
                        >
                          {rule.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                        <Badge variant="info" className="text-xs">
                          Priority: {rule.priority}
                        </Badge>
                      </div>

                      <div className="mt-2 space-y-1">
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Conditions:</span>{" "}
                          {rule.conditions.map((cond, idx) => (
                            <span key={idx}>
                              {cond.field} {getOperatorLabel(cond.operator)}{" "}
                              {cond.value !== null && cond.value !== undefined
                                ? String(cond.value)
                                : ""}
                              {idx < rule.conditions.length - 1 && " AND "}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Actions:</span>{" "}
                          {rule.actions.map((action, idx) => (
                            <span key={idx}>
                              {getActionLabel(action.type)}
                              {idx < rule.actions.length - 1 && ", "}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="ml-4 flex items-center space-x-2">
                      <button
                        onClick={() => handleToggle(rule)}
                        disabled={isToggling === rule.id}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        title={rule.enabled ? "Disable" : "Enable"}
                      >
                        {rule.enabled ? (
                          <ToggleRight className="h-6 w-6 text-primary-600" />
                        ) : (
                          <ToggleLeft className="h-6 w-6" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(rule)}
                        className="text-gray-400 hover:text-primary-600"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rule)}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showCreateModal && (
        <AutomationForm
          rule={editingRule}
          orgId={user?.org_id || ""}
          onClose={() => {
            setShowCreateModal(false);
            setEditingRule(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
