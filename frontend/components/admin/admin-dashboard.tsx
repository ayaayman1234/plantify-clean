"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Loader2, UserCheck, Users, XCircle } from "lucide-react";

import {
  approveExpertApplication,
  fetchAdminOverview,
  getStoredAccessToken,
  rejectExpertApplication,
} from "@/lib/api";
import type { AdminOverview, ExpertApplicationRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
        <Clock className="h-3 w-3" />
        Pending
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Approved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
      <XCircle className="h-3 w-3" />
      Rejected
    </span>
  );
}

function ExpertApplicationCard({
  app,
  onApprove,
  onReject,
  loading,
}: {
  app: ExpertApplicationRecord;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  loading: string | null;
}) {
  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-[var(--text-primary)]">{app.user_name}</p>
            <StatusBadge status={app.status} />
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{app.user_email}</p>
          <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">{app.headline}</p>
        </div>
        <p className="shrink-0 text-xs text-[var(--text-tertiary)]">
          {new Date(app.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">About</p>
          <p className="mt-1 text-[var(--text-secondary)] line-clamp-3">{app.about}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Credentials</p>
          <p className="mt-1 text-[var(--text-secondary)] line-clamp-3">{app.credentials}</p>
        </div>
      </div>

      <div className="mt-2 flex gap-4 text-xs text-[var(--text-tertiary)]">
        <span>📞 {app.phone_number}</span>
        <span>🎓 {app.years_experience} yrs experience</span>
      </div>

      {app.status === "pending" && (
        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={loading === app.id}
            onClick={() => onApprove(app.id)}
          >
            {loading === app.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Approve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 border border-red-500/30 text-red-600 hover:bg-red-500/10 dark:text-red-400"
            disabled={loading === app.id}
            onClick={() => onReject(app.id)}
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </Button>
        </div>
      )}

      {app.review_notes && (
        <p className="mt-3 rounded-lg border border-[var(--card-border)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-tertiary)]">
          📝 {app.review_notes}
        </p>
      )}
    </div>
  );
}

export function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tab, setTab] = useState<"applications" | "users">("applications");

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;
    fetchAdminOverview(token)
      .then(setOverview)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (applicationId: string) => {
    const token = getStoredAccessToken();
    if (!token) return;
    setActionLoading(applicationId);
    setActionError(null);
    try {
      await approveExpertApplication({ token, applicationId });
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              expert_applications: prev.expert_applications.map((a) =>
                a.id === applicationId ? { ...a, status: "approved" } : a
              ),
            }
          : prev
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (applicationId: string) => {
    const token = getStoredAccessToken();
    if (!token) return;
    setActionLoading(applicationId);
    setActionError(null);
    try {
      await rejectExpertApplication({ token, applicationId });
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              expert_applications: prev.expert_applications.map((a) =>
                a.id === applicationId ? { ...a, status: "rejected" } : a
              ),
            }
          : prev
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
        {error}
      </p>
    );
  }

  const pendingApps = overview?.expert_applications.filter((a) => a.status === "pending") ?? [];
  const allApps = overview?.expert_applications ?? [];

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Users", value: overview?.users.length ?? 0, icon: Users },
          { label: "Pending Expert Requests", value: pendingApps.length, icon: Clock, highlight: pendingApps.length > 0 },
          { label: "Total Applications", value: allApps.length, icon: UserCheck },
          { label: "Open Reports", value: overview?.reports.filter((r) => r.status === "open").length ?? 0, icon: XCircle },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border p-4 ${
              stat.highlight
                ? "border-amber-400/40 bg-amber-500/8"
                : "border-[var(--card-border)] bg-[var(--card-bg)]"
            }`}
          >
            <stat.icon className={`h-4 w-4 ${stat.highlight ? "text-amber-500" : "text-[var(--text-tertiary)]"}`} />
            <p className={`mt-2 text-2xl font-bold ${stat.highlight ? "text-amber-600 dark:text-amber-400" : "text-[var(--text-primary)]"}`}>
              {stat.value}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] p-1.5">
        {(["applications", "users"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold capitalize transition ${
              tab === t
                ? "bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t === "applications" ? `Expert Applications ${pendingApps.length > 0 ? `(${pendingApps.length} pending)` : ""}` : "All Users"}
          </button>
        ))}
      </div>

      {/* Action error */}
      {actionError && (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {actionError}
        </p>
      )}

      {/* Expert Applications Tab */}
      {tab === "applications" && (
        <div className="space-y-4">
          {allApps.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--text-tertiary)]">No expert applications yet.</p>
          ) : (
            allApps.map((app) => (
              <ExpertApplicationCard
                key={app.id}
                app={app}
                onApprove={handleApprove}
                onReject={handleReject}
                loading={actionLoading}
              />
            ))
          )}
        </div>
      )}

      {/* Users Tab */}
      {tab === "users" && (
        <div className="overflow-x-auto rounded-2xl border border-[var(--card-border)]">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-[var(--bg-secondary)]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Expert Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Joined</th>
              </tr>
            </thead>
            <tbody>
              {(overview?.users ?? []).map((u) => (
                <tr key={u.id} className="border-b border-[var(--card-border)] last:border-0 hover:bg-[var(--bg-secondary)]/50">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{u.full_name}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      u.role === "admin" || u.role === "developer"
                        ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                        : u.role === "expert"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.expert_application_status !== "none" ? (
                      <StatusBadge status={u.expert_application_status} />
                    ) : (
                      <span className="text-xs text-[var(--text-tertiary)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-tertiary)]">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
