"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Loader2, MessageCircleMore, Search, Send, ShieldCheck, UserPlus, UserRound, X} from "lucide-react";
import {useMemo, useState} from "react";
import {useLocale} from "next-intl";

import {DashboardShell} from "@/components/dashboard/dashboard-shell";
import {type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";
import {Button} from "@/components/ui/button";
import {useAuthSession} from "@/hooks/use-auth-session";
import {useRouter} from "@/i18n/navigation";
import type {AppLocale} from "@/i18n/routing";
import {fetchConversation, fetchExpertsDirectory, sendDirectMessage, sendFriendRequest} from "@/lib/api";

function imageSrc(imageB64?: string | null) {
  return imageB64 ? `data:image/jpeg;base64,${imageB64}` : null;
}

function getLeadLabel(locale: AppLocale) {
  switch (locale) {
    case "ar":
      return "الخبراء";
    case "es":
      return "Expertos";
    case "zh":
      return "专家";
    default:
      return "Experts";
  }
}

function formatDate(date: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale, {dateStyle: "medium", timeStyle: "short"}).format(new Date(date));
}

function PrivateMessagePanel({
  open,
  title,
  draft,
  onDraftChange,
  onClose,
  onSend,
  sending,
  messages,
  loading,
  locale
}: {
  open: boolean;
  title: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onClose: () => void;
  onSend: () => void;
  sending: boolean;
  messages: Array<{id: string; body: string; created_at: string; is_own: boolean}>;
  loading: boolean;
  locale: AppLocale;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/50 p-0 md:items-center md:p-6">
      <div className="flex h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl md:h-[75vh] md:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Private chat</p>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-auto bg-[var(--bg-secondary)]/50 px-5 py-4">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-[var(--text-secondary)]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading private messages...
            </div>
          ) : messages.length ? (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.is_own ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] rounded-[1.4rem] px-4 py-3 text-sm shadow-sm ${message.is_own ? "bg-emerald-600 text-white" : "border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"}`}>
                  <p className="whitespace-pre-wrap leading-6">{message.body}</p>
                  <p className={`mt-2 text-[11px] ${message.is_own ? "text-white/80" : "text-[var(--text-tertiary)]"}`}>{formatDate(message.created_at, locale)}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm text-[var(--text-secondary)]">
              Start a private conversation with this expert.
            </div>
          )}
        </div>

        <div className="border-t border-[var(--card-border)] px-5 py-4">
          <div className="flex gap-3">
            <textarea
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder="Write a private message..."
              disabled={sending}
              className="min-h-24 flex-1 rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-emerald-500/40"
            />
            <Button type="button" className="self-end rounded-2xl" onClick={onSend} disabled={!draft.trim() || sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExpertsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const locale = useLocale() as AppLocale;
  const {token, profile} = useAuthSession();
  const navItems = useMemo<DashboardNavItem[]>(() => [], []);
  const [messageTarget, setMessageTarget] = useState<{id: string; name: string} | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const expertsQuery = useQuery({
    queryKey: ["experts-directory", token],
    queryFn: async () => fetchExpertsDirectory(token ?? ""),
    enabled: Boolean(token)
  });

  const conversationQuery = useQuery({
    queryKey: ["experts-directory-conversation", messageTarget?.id, token],
    queryFn: async () => fetchConversation({token: token ?? "", friendId: messageTarget?.id ?? ""}),
    enabled: Boolean(token && messageTarget?.id)
  });

  const friendRequestMutation = useMutation({
    mutationFn: async (receiverId: string) => sendFriendRequest({token: token ?? "", receiverId}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["experts-directory"]});
    }
  });

  const privateMessageMutation = useMutation({
    mutationFn: async () => sendDirectMessage({token: token ?? "", receiverId: messageTarget?.id ?? "", body: messageDraft}),
    onSuccess: async () => {
      setMessageDraft("");
      await queryClient.invalidateQueries({queryKey: ["experts-directory-conversation", messageTarget?.id, token]});
    }
  });

  const filteredExperts = useMemo(() => {
    const experts = expertsQuery.data?.experts ?? [];
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return experts;
    }

    return experts.filter((entry) =>
      [
        entry.user.full_name,
        entry.expert_profile.headline,
        entry.expert_profile.about,
        entry.expert_profile.credentials,
        entry.expert_profile.phone_number
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [expertsQuery.data?.experts, searchQuery]);

  return (
    <>
      <DashboardShell
        navItems={navItems}
        activeSection="experts"
        topBarLead={
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            {getLeadLabel(locale)}
          </div>
        }
        contentClassName="overflow-auto"
      >
        <section className="space-y-5">
          <div className="rounded-[1.75rem] border border-[var(--card-border)] bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(255,255,255,0.96))] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(24,24,27,0.96))]">
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Approved experts</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Browse the experts approved by the admin team, open their profile, send a friend request, or start a private chat.
            </p>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
              <Search className="h-4 w-4 text-[var(--text-tertiary)]" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search experts by name, headline, phone, or credentials..."
                className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
            </div>
          </div>

          {expertsQuery.isLoading ? (
            <div className="flex min-h-[260px] items-center justify-center rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)]">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading experts...
            </div>
          ) : filteredExperts.length ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {filteredExperts.map((entry) => {
                const isOwnProfile = profile?.id === entry.user.id;
                return (
                  <article key={entry.user.id} className="rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)]">
                        {entry.user.avatar_b64 ? (
                          <img src={imageSrc(entry.user.avatar_b64) ?? ""} alt={entry.user.full_name} className="h-full w-full object-cover" />
                        ) : (
                          <UserRound className="h-7 w-7 text-[var(--text-tertiary)]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          className="text-left text-xl font-semibold text-[var(--text-primary)] underline-offset-4 hover:underline"
                          onClick={() => router.push(`/profile/${entry.user.id}`)}
                        >
                          {entry.user.full_name}
                        </button>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">{entry.expert_profile.headline}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-[var(--text-primary)]">{entry.expert_profile.years_experience} years experience</span>
                          <span className="rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-[var(--text-primary)]">{entry.expert_profile.phone_number}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">About</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{entry.expert_profile.about}</p>
                    </div>

                    <div className="mt-3 rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Credentials</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{entry.expert_profile.credentials}</p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button type="button" variant="secondary" className="rounded-2xl" onClick={() => router.push(`/profile/${entry.user.id}`)}>
                        View Profile
                      </Button>
                      {!isOwnProfile ? (
                        <Button type="button" variant="secondary" className="rounded-2xl" onClick={() => setMessageTarget({id: entry.user.id, name: entry.user.full_name})}>
                          <MessageCircleMore className="h-4 w-4" />
                          {entry.user.friendship_status === "friend" ? "Open Chat" : "Message"}
                        </Button>
                      ) : null}
                      {!isOwnProfile && entry.user.friendship_status === "none" ? (
                        <Button
                          type="button"
                          className="rounded-2xl"
                          onClick={() => friendRequestMutation.mutate(entry.user.id)}
                          disabled={friendRequestMutation.isPending}
                        >
                          {friendRequestMutation.isPending && friendRequestMutation.variables === entry.user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                          Add Friend
                        </Button>
                      ) : null}
                      {!isOwnProfile && entry.user.friendship_status === "pending_sent" ? (
                        <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                          Friend request pending
                        </span>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] px-6 py-14 text-center text-sm text-[var(--text-secondary)]">
              {searchQuery.trim() ? "No experts matched your search." : "No approved experts are available yet."}
            </div>
          )}

          {expertsQuery.isError ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {(expertsQuery.error as Error).message}
            </div>
          ) : null}
        </section>
      </DashboardShell>

      <PrivateMessagePanel
        open={messageTarget !== null}
        title={messageTarget?.name ?? "Private chat"}
        draft={messageDraft}
        onDraftChange={setMessageDraft}
        onClose={() => {
          setMessageTarget(null);
          setMessageDraft("");
        }}
        onSend={() => privateMessageMutation.mutate()}
        sending={privateMessageMutation.isPending}
        messages={conversationQuery.data?.messages ?? []}
        loading={conversationQuery.isLoading}
        locale={locale}
      />
    </>
  );
}
