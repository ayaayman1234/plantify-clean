"use client";

import {useMemo, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Loader2, Search, ShieldCheck, UserCheck, UserX, Users} from "lucide-react";

import {useRouter} from "@/i18n/navigation";
import {
  approveExpertApplication,
  banUser,
  fetchAdminOverview,
  rejectExpertApplication,
  unbanUser,
  updateUserReportStatus,
  updateUserPostingPermission
} from "@/lib/api";
import {useAuthSession} from "@/hooks/use-auth-session";
import {Button} from "@/components/ui/button";

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {dateStyle: "medium", timeStyle: "short"}).format(new Date(date));
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const {token, profile} = useAuthSession();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionTone, setActionTone] = useState<"success" | "error">("success");
  const [searchQuery, setSearchQuery] = useState("");
  const isAdmin = profile?.role === "admin" || profile?.role === "developer";

  const overviewQuery = useQuery({
    queryKey: ["admin-overview", token],
    queryFn: () => fetchAdminOverview(token ?? ""),
    enabled: Boolean(token && isAdmin)
  });

  const refreshOverview = async () => {
    await queryClient.invalidateQueries({queryKey: ["admin-overview"]});
  };

  const approveMutation = useMutation({
    mutationFn: (applicationId: string) => approveExpertApplication({token: token ?? "", applicationId}),
    onSuccess: async () => {
      setActionTone("success");
      setActionMessage("Expert application approved.");
      await refreshOverview();
    },
    onError: (error: Error) => {
      setActionTone("error");
      setActionMessage(error.message);
    }
  });
  const rejectMutation = useMutation({
    mutationFn: (applicationId: string) => rejectExpertApplication({token: token ?? "", applicationId}),
    onSuccess: async () => {
      setActionTone("success");
      setActionMessage("Expert application rejected.");
      await refreshOverview();
    },
    onError: (error: Error) => {
      setActionTone("error");
      setActionMessage(error.message);
    }
  });
  const postPermissionMutation = useMutation({
    mutationFn: (input: {userId: string; canCreatePosts: boolean}) =>
      updateUserPostingPermission({token: token ?? "", ...input}),
    onSuccess: async (_, variables) => {
      setActionTone("success");
      setActionMessage(variables.canCreatePosts ? "Posting enabled for user." : "Posting disabled for user.");
      await refreshOverview();
    },
    onError: (error: Error) => {
      setActionTone("error");
      setActionMessage(error.message);
    }
  });
  const banMutation = useMutation({
    mutationFn: (input: {userId: string; reason?: string}) => banUser({token: token ?? "", ...input}),
    onSuccess: async () => {
      setActionTone("success");
      setActionMessage("User banned successfully.");
      await refreshOverview();
    },
    onError: (error: Error) => {
      setActionTone("error");
      setActionMessage(error.message);
    }
  });
  const unbanMutation = useMutation({
    mutationFn: (userId: string) => unbanUser({token: token ?? "", userId}),
    onSuccess: async () => {
      setActionTone("success");
      setActionMessage("User unbanned successfully.");
      await refreshOverview();
    },
    onError: (error: Error) => {
      setActionTone("error");
      setActionMessage(error.message);
    }
  });
  const reportStatusMutation = useMutation({
    mutationFn: (input: {reportId: string; status: "open" | "reviewed" | "dismissed"}) =>
      updateUserReportStatus({token: token ?? "", ...input}),
    onSuccess: async (_, variables) => {
      setActionTone("success");
      setActionMessage(
        variables.status === "reviewed"
          ? "Report marked as reviewed."
          : variables.status === "dismissed"
            ? "Report dismissed."
            : "Report reopened."
      );
      await refreshOverview();
    },
    onError: (error: Error) => {
      setActionTone("error");
      setActionMessage(error.message);
    }
  });

  const overview = overviewQuery.data;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  
  const filteredReports = useMemo(() => {
    const reports = overview?.reports ?? [];
    if (!normalizedQuery) return reports;
    return reports.filter((report) =>
      [
        report.report_type,
        report.reason,
        report.status,
        report.reporter_user_name,
        report.reporter_user_email,
        report.target_user_name,
        report.target_user_email
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [normalizedQuery, overview?.reports]);

  const filteredApplications = useMemo(() => {
    const applications = overview?.expert_applications ?? [];
    if (!normalizedQuery) return applications;
    return applications.filter((application) =>
      [
        application.user_name,
        application.user_email,
        application.headline,
        application.phone_number,
        application.about,
        application.credentials,
        application.status
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [normalizedQuery, overview?.expert_applications]);

  const filteredUsers = useMemo(() => {
    const users = overview?.users ?? [];
    if (!normalizedQuery) return users;
    return users.filter((user) =>
      [
        user.full_name,
        user.email,
        user.role,
        user.expert_application_status,
        user.banned_reason ?? ""
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [normalizedQuery, overview?.users]);

  if (!token) {
    return <main className="mx-auto max-w-5xl px-4 py-10 text-sm text-[var(--text-secondary)]">Please sign in to access admin tools.</main>;
  }

  if (!isAdmin) {
    return <main className="mx-auto max-w-5xl px-4 py-10 text-sm text-[var(--text-secondary)]">You do not have permission to access the admin panel.</main>;
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <section className="rounded-[1.8rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Admin Control Center</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Review expert applications, approve doctors, and decide which users are allowed to publish community posts.
            </p>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-3">
              <Search className="h-4 w-4 text-[var(--text-tertiary)]" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search users, reports, expert requests..."
                className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
            </div>
          </div>
        </div>
      </section>

      {overviewQuery.isLoading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-[1.8rem] border border-[var(--card-border)] bg-[var(--card-bg)]">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : null}

      {overviewQuery.isError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {(overviewQuery.error as Error).message}
        </div>
      ) : null}

      {actionMessage ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            actionTone === "success"
              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
              : "border border-red-500/20 bg-red-500/10 text-red-700"
          }`}
        >
          {actionMessage}
        </div>
      ) : null}

      {overview ? (
        <>
          <section className="rounded-[1.8rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="mb-5 flex items-center gap-3">
              <UserX className="h-5 w-5 text-emerald-700" />
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">User reports</h2>
            </div>

            <div className="space-y-4">
              {filteredReports.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">{searchQuery.trim() ? "No reports matched your search." : "There are no reports yet."}</p>
              ) : (
                filteredReports.map((report) => (
                  <article key={report.id} className="rounded-[1.4rem] border border-[var(--card-border)] bg-[var(--bg-secondary)] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[var(--card-bg)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-primary)]">
                            {report.report_type === "post" ? "Post report" : "Profile report"}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                              report.status === "open"
                                ? "bg-amber-500/10 text-amber-700"
                                : report.status === "reviewed"
                                  ? "bg-emerald-500/10 text-emerald-700"
                                  : "bg-slate-500/10 text-slate-700"
                            }`}
                          >
                            {report.status}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">
                          <span className="font-semibold text-[var(--text-primary)]">{report.reporter_user_name}</span> reported{" "}
                          <span className="font-semibold text-[var(--text-primary)]">{report.target_user_name}</span>
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-tertiary)]">{report.reporter_user_email}</p>
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)]">{formatDate(report.created_at)}</p>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-[var(--card-bg)] p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Reported user</p>
                        <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{report.target_user_name}</p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">{report.target_user_email}</p>
                      </div>
                      <div className="rounded-2xl bg-[var(--card-bg)] p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Reason</p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--text-primary)]">{report.reason}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-2xl"
                        onClick={() => router.push(`/profile/${report.target_user_id}`)}
                      >
                        View profile
                      </Button>
                      {report.post_id ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-2xl"
                          onClick={() => router.push("/community")}
                        >
                          View community
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        className="rounded-2xl"
                        disabled={reportStatusMutation.isPending}
                        onClick={() => reportStatusMutation.mutate({reportId: report.id, status: "reviewed"})}
                      >
                        {reportStatusMutation.isPending && reportStatusMutation.variables?.reportId === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Mark reviewed
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="rounded-2xl"
                        disabled={reportStatusMutation.isPending}
                        onClick={() => reportStatusMutation.mutate({reportId: report.id, status: "dismissed"})}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="mb-5 flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-emerald-700" />
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Pending expert applications</h2>
            </div>

            <div className="space-y-4">
              {filteredApplications.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">{searchQuery.trim() ? "No expert applications matched your search." : "There are no expert applications yet."}</p>
              ) : (
                filteredApplications.map((application) => (
                  <article key={application.id} className="rounded-[1.4rem] border border-[var(--card-border)] bg-[var(--bg-secondary)] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{application.user_name}</h3>
                        <p className="text-sm text-[var(--text-secondary)]">{application.user_email}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{application.status}</p>
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)]">{formatDate(application.created_at)}</p>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-[var(--card-bg)] p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Headline</p>
                        <p className="mt-2 text-sm text-[var(--text-primary)]">{application.headline}</p>
                      </div>
                      <div className="rounded-2xl bg-[var(--card-bg)] p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Experience</p>
                        <p className="mt-2 text-sm text-[var(--text-primary)]">{application.years_experience} years</p>
                      </div>
                      <div className="rounded-2xl bg-[var(--card-bg)] p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Phone</p>
                        <p className="mt-2 text-sm text-[var(--text-primary)]">{application.phone_number}</p>
                      </div>
                      <div className="rounded-2xl bg-[var(--card-bg)] p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">About</p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--text-primary)]">{application.about}</p>
                      </div>
                      <div className="rounded-2xl bg-[var(--card-bg)] p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Credentials</p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--text-primary)]">{application.credentials}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-2xl"
                        onClick={() => router.push(`/profile/${application.user_id}`)}
                      >
                        View profile
                      </Button>
                      <Button
                        type="button"
                        className="rounded-2xl"
                        disabled={approveMutation.isPending || application.status === "approved"}
                        onClick={() => approveMutation.mutate(application.id)}
                      >
                        {approveMutation.isPending && approveMutation.variables === application.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                        Approve as expert
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="rounded-2xl"
                        disabled={rejectMutation.isPending || application.status === "rejected"}
                        onClick={() => rejectMutation.mutate(application.id)}
                      >
                        {rejectMutation.isPending && rejectMutation.variables === application.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                        Reject
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="mb-5 flex items-center gap-3">
              <Users className="h-5 w-5 text-emerald-700" />
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Users and posting access</h2>
            </div>
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex flex-col gap-4 rounded-[1.4rem] border border-[var(--card-border)] bg-[var(--bg-secondary)] p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <button
                      type="button"
                      className="font-semibold text-[var(--text-primary)] underline-offset-4 hover:underline"
                      onClick={() => router.push(`/profile/${user.id}`)}
                    >
                      {user.full_name}
                    </button>
                    <p className="text-sm text-[var(--text-secondary)]">{user.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-[var(--card-bg)] px-3 py-1 text-[var(--text-primary)]">{user.role}</span>
                      <span className="rounded-full bg-[var(--card-bg)] px-3 py-1 text-[var(--text-primary)]">expert: {user.expert_application_status}</span>
                      <span className="rounded-full bg-[var(--card-bg)] px-3 py-1 text-[var(--text-primary)]">joined {formatDate(user.created_at)}</span>
                      <span className={`rounded-full px-3 py-1 ${user.is_banned ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-700"}`}>
                        {user.is_banned ? "banned" : "active"}
                      </span>
                      {user.banned_reason ? (
                        <span className="rounded-full bg-red-500/10 px-3 py-1 text-red-600">reason: {user.banned_reason}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-2xl"
                      onClick={() => router.push(`/profile/${user.id}`)}
                    >
                      View profile
                    </Button>
                    <Button
                      type="button"
                      variant={user.can_create_posts ? "success" : "secondary"}
                      className="rounded-2xl"
                      disabled={postPermissionMutation.isPending}
                      onClick={() => postPermissionMutation.mutate({userId: user.id, canCreatePosts: !user.can_create_posts})}
                    >
                      {postPermissionMutation.isPending && postPermissionMutation.variables?.userId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {user.can_create_posts ? "Posting enabled" : "Enable posting"}
                    </Button>
                    {user.is_banned ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="rounded-2xl"
                        disabled={unbanMutation.isPending}
                        onClick={() => unbanMutation.mutate(user.id)}
                      >
                        {unbanMutation.isPending && unbanMutation.variables === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Unban
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="destructive"
                        className="rounded-2xl"
                        disabled={banMutation.isPending || user.id === profile?.id}
                        onClick={() => {
                          const reason = window.prompt("Enter ban reason (optional):") ?? "";
                          setActionTone("success");
                          setActionMessage(null);
                          banMutation.mutate({userId: user.id, reason});
                        }}
                      >
                        {banMutation.isPending && banMutation.variables?.userId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Ban
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">No users matched your search.</p>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
