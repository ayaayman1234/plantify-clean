"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Flag, Loader2, MessageCircleMore, Send, UserPlus, UserRound, X} from "lucide-react";
import {useParams} from "next/navigation";
import {useLocale} from "next-intl";
import {useMemo, useState} from "react";

import {DashboardShell} from "@/components/dashboard/dashboard-shell";
import {type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";
import {Button} from "@/components/ui/button";
import {useAuthSession} from "@/hooks/use-auth-session";
import {fetchConversation, fetchPublicUserProfile, fetchSocialOverview, reportUserProfile, sendDirectMessage, sendFriendRequest} from "@/lib/api";
import {formatBoostedConfidence} from "@/lib/confidence";
import {getDashboardCopy} from "@/lib/dashboard-copy";
import type {AppLocale} from "@/i18n/routing";

function imageSrc(imageB64?: string | null) {
  return imageB64 ? `data:image/jpeg;base64,${imageB64}` : null;
}

function formatDate(date: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale, {dateStyle: "medium", timeStyle: "short"}).format(new Date(date));
}

function ExpertInfoCard({
  headline,
  phoneNumber,
  about,
  credentials,
  yearsExperience
}: {
  headline: string;
  phoneNumber: string;
  about: string;
  credentials: string;
  yearsExperience: number;
}) {
  return (
    <div className="mt-6 rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--bg-secondary)] p-5 text-start">
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">Expert info</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Headline</p>
          <p className="mt-2 font-semibold text-[var(--text-primary)]">{headline}</p>
        </div>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Phone</p>
          <p className="mt-2 font-semibold text-[var(--text-primary)]">{phoneNumber}</p>
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Experience</p>
        <p className="mt-2 font-semibold text-[var(--text-primary)]">{yearsExperience} years</p>
      </div>
      <div className="mt-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">About</p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{about}</p>
      </div>
      <div className="mt-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Credentials</p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{credentials}</p>
      </div>
    </div>
  );
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
              Start a private conversation from this profile.
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

export default function PublicProfilePage() {
  const queryClient = useQueryClient();
  const params = useParams<{userId: string}>();
  const locale = useLocale() as AppLocale;
  const copy = getDashboardCopy(locale).profile;
  const {token, profile: currentProfile} = useAuthSession();
  const navItems = useMemo<DashboardNavItem[]>(() => [], []);
  const userId = typeof params?.userId === "string" ? params.userId : "";
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["public-profile", userId, token],
    queryFn: async () => fetchPublicUserProfile({token: token ?? "", userId}),
    enabled: Boolean(token && userId)
  });

  const socialOverviewQuery = useQuery({
    queryKey: ["public-profile-social-overview", token],
    queryFn: async () => fetchSocialOverview(token ?? ""),
    enabled: Boolean(token)
  });

  const conversationQuery = useQuery({
    queryKey: ["public-profile-conversation", userId, token],
    queryFn: async () => fetchConversation({token: token ?? "", friendId: userId}),
    enabled: Boolean(token && userId && messageOpen)
  });

  const friendRequestMutation = useMutation({
    mutationFn: async () => sendFriendRequest({token: token ?? "", receiverId: userId}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["public-profile-social-overview"]});
    }
  });

  const privateMessageMutation = useMutation({
    mutationFn: async () => sendDirectMessage({token: token ?? "", receiverId: userId, body: messageDraft}),
    onSuccess: async () => {
      setMessageDraft("");
      await queryClient.invalidateQueries({queryKey: ["public-profile-conversation", userId, token]});
    }
  });
  const reportProfileMutation = useMutation({
    mutationFn: async (reason: string) => reportUserProfile({token: token ?? "", userId, reason}),
    onSuccess: () => {
      setReportError(null);
      setReportMessage("Your report was sent to the admin.");
    },
    onError: (error: Error) => {
      setReportMessage(null);
      setReportError(error.message);
    }
  });

  const profile = profileQuery.data;
  const socialUser = useMemo(() => {
    const overview = socialOverviewQuery.data;
    if (!overview) return null;
    const allUsers = [
      ...overview.discoverable_users,
      ...overview.friends.map((friend) => friend.user),
      ...overview.received_requests.flatMap((request) => [request.sender, request.receiver]),
      ...overview.sent_requests.flatMap((request) => [request.sender, request.receiver]),
    ];
    return allUsers.find((item) => item.id === userId) ?? null;
  }, [socialOverviewQuery.data, userId]);
  const isOwnProfile = currentProfile?.id === userId;

  return (
    <>
      <DashboardShell
        navItems={navItems}
        activeSection="profile"
        topBarLead={
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            <UserRound className="h-3.5 w-3.5" />
            Public Profile
          </div>
        }
        contentClassName="overflow-auto"
      >
        {!profile ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {profileQuery.isError ? (profileQuery.error as Error).message : copy.loading}
          </div>
        ) : (
          <section className="grid gap-5 xl:grid-cols-[0.9fr,1.1fr]">
            <article className="rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)]">
                  {profile.avatar_b64 ? (
                    <img src={imageSrc(profile.avatar_b64) ?? ""} alt={profile.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-14 w-14 text-[var(--text-tertiary)]" />
                  )}
                </div>

                <h1 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">{profile.full_name}</h1>
                <div className="mt-4 inline-flex rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]">
                  {copy.roleLabel}: {profile.role}
                </div>

                {!isOwnProfile ? (
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    {socialUser?.friendship_status === "none" || !socialUser ? (
                      <Button type="button" className="rounded-2xl" onClick={() => friendRequestMutation.mutate()} disabled={friendRequestMutation.isPending}>
                        {friendRequestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                        Add Friend
                      </Button>
                    ) : null}
                    {socialUser?.friendship_status === "pending_sent" ? (
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                        Friend request pending
                      </span>
                    ) : null}
                    <Button type="button" variant="secondary" className="rounded-2xl" onClick={() => setMessageOpen(true)}>
                      <MessageCircleMore className="h-4 w-4" />
                      {socialUser?.friendship_status === "friend" ? "Open Chat" : "Message"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-2xl border border-red-500/20 text-red-600"
                      disabled={reportProfileMutation.isPending}
                      onClick={() => {
                        const reason = window.prompt("Why are you reporting this profile?");
                        if (!reason || !reason.trim()) return;
                        setReportMessage(null);
                        setReportError(null);
                        reportProfileMutation.mutate(reason.trim());
                      }}
                    >
                      {reportProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                      Report
                    </Button>
                  </div>
                ) : null}

                {reportMessage ? (
                  <div className="mt-4 w-full rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
                    {reportMessage}
                  </div>
                ) : null}

                {reportError ? (
                  <div className="mt-4 w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
                    {reportError}
                  </div>
                ) : null}

                <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{copy.posts}</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{profile.posts_count}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{copy.joined}</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{new Date(profile.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {profile.expert_profile ? (
                  <ExpertInfoCard
                    headline={profile.expert_profile.headline}
                    phoneNumber={profile.expert_profile.phone_number}
                    about={profile.expert_profile.about}
                    credentials={profile.expert_profile.credentials}
                    yearsExperience={profile.expert_profile.years_experience}
                  />
                ) : null}

                <Button type="button" variant="secondary" className="mt-6 rounded-2xl" onClick={() => window.history.back()}>
                  <MessageCircleMore className="h-4 w-4" />
                  Back
                </Button>
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">{copy.yourPosts}</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">Community posts published by this user.</p>

              <div className="mt-5 space-y-4">
                {profile.posts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-10 text-center text-sm text-[var(--text-secondary)]">
                    {copy.noPosts}
                  </div>
                ) : (
                  profile.posts.map((post) => (
                    <div key={post.id} className="overflow-hidden rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--bg-secondary)]">
                      {post.image_b64 ? <img src={imageSrc(post.image_b64) ?? ""} alt={post.ai_plant_name} className="h-52 w-full object-cover" /> : null}
                      <div className="space-y-3 p-4">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{copy.plant}</p>
                            <p className="mt-1 font-semibold text-[var(--text-primary)]">{post.ai_plant_name}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{copy.disease}</p>
                            <p className="mt-1 font-semibold text-[var(--text-primary)]">{post.ai_disease}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{copy.confidence}</p>
                            <p className="mt-1 font-semibold text-[var(--text-primary)]">{formatBoostedConfidence(post.ai_confidence_score)}</p>
                          </div>
                        </div>
                        <p className="text-sm leading-6 text-[var(--text-primary)]">{post.post_text}</p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                          <span>{new Date(post.created_at).toLocaleString()}</span>
                          <span>{post.likes_count} {copy.likes}</span>
                          <span>{post.comments_count} {copy.comments}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>
        )}
      </DashboardShell>

      <PrivateMessagePanel
        open={messageOpen}
        title={profile?.full_name ?? "Private chat"}
        draft={messageDraft}
        onDraftChange={setMessageDraft}
        onClose={() => {
          setMessageOpen(false);
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
