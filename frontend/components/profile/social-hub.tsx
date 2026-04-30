"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircleMore, Search, Send, UserPlus, Users, X } from "lucide-react";
import { useLocale } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  acceptFriendRequest,
  fetchConversation,
  fetchSocialOverview,
  rejectFriendRequest,
  sendDirectMessage,
  sendFriendRequest,
} from "@/lib/api";
import type { FriendConnection } from "@/lib/types";
import type { AppLocale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

function imageSrc(imageB64?: string | null) {
  return imageB64 ? `data:image/jpeg;base64,${imageB64}` : null;
}

const EMPTY_FRIENDS: FriendConnection[] = [];

function formatDate(date: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

function getSocialCopy(locale: AppLocale) {
  const all = {
    en: {
      badge: "Social",
      title: "Chat & Friend Requests",
      description: "Search for people, send friend requests, and message your friends directly inside Plantify.",
      discover: "Discover People",
      received: "Received Requests",
      sent: "Sent Requests",
      friends: "Friends",
      addFriend: "Add Friend",
      pending: "Pending",
      accept: "Accept",
      reject: "Decline",
      openChat: "Open Chat",
      noUsers: "No other users are available right now.",
      noReceived: "No incoming friend requests.",
      noSent: "No sent requests yet.",
      noFriends: "Once you add friends, your chats will appear here.",
      chatTitle: "Conversation",
      chatPlaceholder: "Write a message...",
      chatEmpty: "Pick a friend from the list to start chatting.",
      send: "Send",
      sending: "Sending...",
      friendsSince: "Friends since",
      unread: "Unread",
      role: "Role",
      search: "Search for a friend...",
      quickAdd: "Quick Add",
      loading: "Loading...",
      loadingMessages: "Loading messages...",
    },
    ar: {
      badge: "التواصل",
      title: "الشات وطلبات الصداقة",
      description: "ابحث عن الأصدقاء، ابعت طلب صداقة، وافتح محادثة مباشرة داخل Plantify.",
      discover: "اكتشف المستخدمين",
      received: "طلبات واردة",
      sent: "طلبات مرسلة",
      friends: "الأصدقاء",
      addFriend: "إضافة صديق",
      pending: "قيد الانتظار",
      accept: "قبول",
      reject: "رفض",
      openChat: "فتح الشات",
      noUsers: "لا يوجد مستخدمون آخرون حاليًا.",
      noReceived: "لا توجد طلبات صداقة واردة.",
      noSent: "لا توجد طلبات صداقة مرسلة.",
      noFriends: "عندما تضيف أصدقاء سيظهرون هنا.",
      chatTitle: "المحادثة",
      chatPlaceholder: "اكتب رسالتك هنا...",
      chatEmpty: "اختر صديقًا من القائمة لبدء المحادثة.",
      send: "إرسال",
      sending: "جارٍ الإرسال...",
      friendsSince: "أصدقاء منذ",
      unread: "غير مقروءة",
      role: "الدور",
      search: "ابحث عن صديق...",
      quickAdd: "إضافة سريعة",
      loading: "جارٍ التحميل...",
      loadingMessages: "جارٍ تحميل الرسائل...",
    },
    es: {
      badge: "Social",
      title: "Chat y solicitudes de amistad",
      description: "Busca personas, envia solicitudes de amistad y chatea con tus amigos dentro de Plantify.",
      discover: "Descubrir personas",
      received: "Solicitudes recibidas",
      sent: "Solicitudes enviadas",
      friends: "Amigos",
      addFriend: "Agregar amigo",
      pending: "Pendiente",
      accept: "Aceptar",
      reject: "Rechazar",
      openChat: "Abrir chat",
      noUsers: "No hay otros usuarios disponibles ahora mismo.",
      noReceived: "No hay solicitudes recibidas.",
      noSent: "Todavia no hay solicitudes enviadas.",
      noFriends: "Cuando agregues amigos, tus chats apareceran aqui.",
      chatTitle: "Conversacion",
      chatPlaceholder: "Escribe un mensaje...",
      chatEmpty: "Elige un amigo de la lista para empezar a chatear.",
      send: "Enviar",
      sending: "Enviando...",
      friendsSince: "Amigos desde",
      unread: "Sin leer",
      role: "Rol",
      search: "Buscar un amigo...",
      quickAdd: "Agregar rapido",
      loading: "Cargando...",
      loadingMessages: "Cargando mensajes...",
    },
    hi: {
      badge: "Social",
      title: "Chat aur friend requests",
      description: "Logon ko dhoondhiye, friend request bhejiye, aur Plantify ke andar doston se seedha chat kijiye.",
      discover: "Logon ko dekhiye",
      received: "Aayi hui requests",
      sent: "Bheji hui requests",
      friends: "Dost",
      addFriend: "Friend add karein",
      pending: "Pending",
      accept: "Accept",
      reject: "Reject",
      openChat: "Chat kholen",
      noUsers: "Is waqt koi aur users available nahin hain.",
      noReceived: "Koi incoming friend requests nahin hain.",
      noSent: "Abhi tak koi sent requests nahin hain.",
      noFriends: "Jab aap dost add karenge, aapke chats yahan dikhai denge.",
      chatTitle: "Conversation",
      chatPlaceholder: "Message likhiye...",
      chatEmpty: "Chat shuru karne ke liye list se ek dost chuniye.",
      send: "Send",
      sending: "Sending...",
      friendsSince: "Dosti shuru hui",
      unread: "Unread",
      role: "Role",
      search: "Ek dost dhoondhiye...",
      quickAdd: "Quick Add",
      loading: "Loading...",
      loadingMessages: "Messages load ho rahe hain...",
    },
    zh: {
      badge: "Social",
      title: "聊天与好友请求",
      description: "搜索用户、发送好友请求，并在 Plantify 内直接与好友聊天。",
      discover: "发现用户",
      received: "收到的请求",
      sent: "已发送的请求",
      friends: "好友",
      addFriend: "添加好友",
      pending: "等待中",
      accept: "接受",
      reject: "拒绝",
      openChat: "打开聊天",
      noUsers: "当前没有其他可用用户。",
      noReceived: "暂无收到的好友请求。",
      noSent: "暂时没有已发送请求。",
      noFriends: "添加好友后，你的聊天会显示在这里。",
      chatTitle: "对话",
      chatPlaceholder: "输入消息...",
      chatEmpty: "从列表中选择一位好友开始聊天。",
      send: "发送",
      sending: "发送中...",
      friendsSince: "成为好友于",
      unread: "未读",
      role: "角色",
      search: "搜索好友...",
      quickAdd: "快速添加",
      loading: "加载中...",
      loadingMessages: "正在加载消息...",
    },
  } satisfies Record<AppLocale, Record<string, string>>;

  const base = all[locale] ?? all.en;
  const viewProfileByLocale: Record<AppLocale, string> = {
    en: "View Profile",
    ar: "عرض البروفايل",
    es: "Ver perfil",
    hi: "Profile dekhein",
    zh: "查看个人资料",
  };

  return {
    ...base,
    viewProfile: viewProfileByLocale[locale] ?? viewProfileByLocale.en,
  };
}

function UserAvatar({ name, avatarB64 }: { name: string; avatarB64?: string | null }) {
  const src = imageSrc(avatarB64);

  return (
    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)]">
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-semibold text-[var(--text-primary)]">{name.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}

function SocialCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <article className="rounded-[1.6rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
        {action}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </article>
  );
}

export function SocialHub({ locale: localeOverride }: { locale?: AppLocale }) {
  const detectedLocale = useLocale() as AppLocale;
  const locale = localeOverride ?? detectedLocale;
  const copy = getSocialCopy(locale);
  const router = useRouter();
  const { token } = useAuthSession();
  const queryClient = useQueryClient();
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const overviewQuery = useQuery({
    queryKey: ["social-overview", token],
    queryFn: async () => fetchSocialOverview(token ?? ""),
    enabled: Boolean(token),
  });

  const conversationQuery = useQuery({
    queryKey: ["social-conversation", selectedFriendId, token],
    queryFn: async () => fetchConversation({ token: token ?? "", friendId: selectedFriendId ?? "" }),
    enabled: Boolean(token && selectedFriendId),
    refetchInterval: selectedFriendId ? 7000 : false,
  });

  const invalidateSocial = async () => {
    await queryClient.invalidateQueries({ queryKey: ["social-overview"] });
    if (selectedFriendId) {
      await queryClient.invalidateQueries({ queryKey: ["social-conversation", selectedFriendId, token] });
    }
  };

  const sendRequestMutation = useMutation({
    mutationFn: async (receiverId: string) => sendFriendRequest({ token: token ?? "", receiverId }),
    onSuccess: invalidateSocial,
  });

  const acceptRequestMutation = useMutation({
    mutationFn: async (requestId: string) => acceptFriendRequest({ token: token ?? "", requestId }),
    onSuccess: invalidateSocial,
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async (requestId: string) => rejectFriendRequest({ token: token ?? "", requestId }),
    onSuccess: invalidateSocial,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => sendDirectMessage({ token: token ?? "", receiverId: selectedFriendId ?? "", body: draft }),
    onSuccess: async () => {
      setDraft("");
      await invalidateSocial();
    },
  });

  const friends = overviewQuery.data?.friends ?? EMPTY_FRIENDS;
  const selectedFriend = friends.find((item) => item.user.id === selectedFriendId) ?? null;
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const discoverableUsers = (overviewQuery.data?.discoverable_users ?? []).filter((user) => {
    if (!normalizedSearch) return true;
    return user.full_name.toLowerCase().includes(normalizedSearch) || user.role.toLowerCase().includes(normalizedSearch);
  });

  const filteredFriends = friends.filter((friend) => {
    if (!normalizedSearch) return true;
    return (
      friend.user.full_name.toLowerCase().includes(normalizedSearch) ||
      friend.user.role.toLowerCase().includes(normalizedSearch)
    );
  });

  useEffect(() => {
    if (!selectedFriendId && filteredFriends.length > 0) {
      setSelectedFriendId(filteredFriends[0].user.id);
      return;
    }

    if (selectedFriendId && !friends.some((item) => item.user.id === selectedFriendId)) {
      setSelectedFriendId(friends[0]?.user.id ?? null);
    }
  }, [filteredFriends, friends, selectedFriendId]);

  if (!token) {
    return null;
  }

  const renderUserRow = (friend: FriendConnection) => (
    <button
      key={friend.user.id}
      type="button"
      onClick={() => setSelectedFriendId(friend.user.id)}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
        selectedFriendId === friend.user.id
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-[var(--card-border)] bg-[var(--bg-secondary)]"
      }`}
    >
      <UserAvatar name={friend.user.full_name} avatarB64={friend.user.avatar_b64} />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          className="truncate font-semibold text-[var(--text-primary)] underline-offset-4 hover:underline"
          onClick={(event) => {
            event.stopPropagation();
            router.push(`/profile/${friend.user.id}`);
          }}
        >
          {friend.user.full_name}
        </button>
        <p className="text-xs text-[var(--text-secondary)]">
          {copy.role}: {friend.user.role}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="rounded-xl"
        onClick={(event) => {
          event.stopPropagation();
          router.push(`/profile/${friend.user.id}`);
        }}
      >
        {copy.viewProfile}
      </Button>
      <div className="text-right">
        <p className="text-xs text-[var(--text-tertiary)]">{copy.friendsSince}</p>
        <p className="text-xs font-medium text-[var(--text-primary)]">{formatDate(friend.friends_since, locale)}</p>
        {friend.unread_messages_count > 0 ? (
          <span className="mt-1 inline-flex rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
            {friend.unread_messages_count} {copy.unread}
          </span>
        ) : null}
      </div>
    </button>
  );

  return (
    <section className="mt-6 space-y-5" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="rounded-[1.75rem] border border-[var(--card-border)] bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(255,255,255,0.96))] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(24,24,27,0.96))]">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
          <Users className="h-3.5 w-3.5" />
          {copy.badge}
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">{copy.title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{copy.description}</p>
        <div className="mt-5 flex max-w-xl items-center gap-3 rounded-[1.25rem] border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3 shadow-sm">
          <Search className="h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={copy.search}
            className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          />
        </div>
      </div>

      {overviewQuery.isLoading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-[1.6rem] border border-[var(--card-border)] bg-[var(--card-bg)]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {copy.loading}
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[0.95fr,1.05fr]">
          <div className="space-y-5">
            <SocialCard title={copy.received}>
              {overviewQuery.data?.received_requests.length ? (
                overviewQuery.data.received_requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-3"
                  >
                    <UserAvatar name={request.sender.full_name} avatarB64={request.sender.avatar_b64} />
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        className="truncate font-semibold text-[var(--text-primary)] underline-offset-4 hover:underline"
                        onClick={() => router.push(`/profile/${request.sender.id}`)}
                      >
                        {request.sender.full_name}
                      </button>
                      <p className="text-xs text-[var(--text-secondary)]">{formatDate(request.created_at, locale)}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => router.push(`/profile/${request.sender.id}`)}>
                      {copy.viewProfile}
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl"
                      onClick={() => acceptRequestMutation.mutate(request.id)}
                      disabled={acceptRequestMutation.isPending}
                    >
                      {acceptRequestMutation.isPending && acceptRequestMutation.variables === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      {copy.accept}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-xl"
                      onClick={() => rejectRequestMutation.mutate(request.id)}
                      disabled={rejectRequestMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                      {copy.reject}
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">{copy.noReceived}</p>
              )}
            </SocialCard>

            <SocialCard
              title={copy.discover}
              action={
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <UserPlus className="h-3.5 w-3.5" />
                  {copy.quickAdd}
                </div>
              }
            >
              {discoverableUsers.length ? (
                discoverableUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-3"
                  >
                    <UserAvatar name={user.full_name} avatarB64={user.avatar_b64} />
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        className="truncate font-semibold text-[var(--text-primary)] underline-offset-4 hover:underline"
                        onClick={() => router.push(`/profile/${user.id}`)}
                      >
                        {user.full_name}
                      </button>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {copy.role}: {user.role}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => router.push(`/profile/${user.id}`)}>
                      {copy.viewProfile}
                    </Button>
                    {user.friendship_status === "none" ? (
                      <Button
                        size="sm"
                        className="gap-2 rounded-xl"
                        onClick={() => sendRequestMutation.mutate(user.id)}
                        disabled={sendRequestMutation.isPending}
                      >
                        {sendRequestMutation.isPending && sendRequestMutation.variables === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">{copy.addFriend}</span>
                      </Button>
                    ) : null}
                    {user.friendship_status === "pending_sent" ? (
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                        {copy.pending}
                      </span>
                    ) : null}
                    {user.friendship_status === "pending_received" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="rounded-xl"
                          onClick={() => acceptRequestMutation.mutate(user.pending_request_id ?? "")}
                          disabled={acceptRequestMutation.isPending}
                        >
                          {copy.accept}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-xl"
                          onClick={() => rejectRequestMutation.mutate(user.pending_request_id ?? "")}
                          disabled={rejectRequestMutation.isPending}
                        >
                          {copy.reject}
                        </Button>
                      </div>
                    ) : null}
                    {user.friendship_status === "friend" ? (
                      <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => setSelectedFriendId(user.id)}>
                        <MessageCircleMore className="h-4 w-4" />
                        {copy.openChat}
                      </Button>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">{copy.noUsers}</p>
              )}
            </SocialCard>

            <SocialCard title={copy.sent}>
              {overviewQuery.data?.sent_requests.length ? (
                overviewQuery.data.sent_requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-3"
                  >
                    <UserAvatar name={request.receiver.full_name} avatarB64={request.receiver.avatar_b64} />
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        className="truncate font-semibold text-[var(--text-primary)] underline-offset-4 hover:underline"
                        onClick={() => router.push(`/profile/${request.receiver.id}`)}
                      >
                        {request.receiver.full_name}
                      </button>
                      <p className="text-xs text-[var(--text-secondary)]">{formatDate(request.created_at, locale)}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => router.push(`/profile/${request.receiver.id}`)}>
                      {copy.viewProfile}
                    </Button>
                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {copy.pending}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">{copy.noSent}</p>
              )}
            </SocialCard>
          </div>

          <div className="space-y-5">
            <SocialCard title={copy.friends}>
              {filteredFriends.length ? (
                filteredFriends.map(renderUserRow)
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">{copy.noFriends}</p>
              )}
            </SocialCard>

            <article className="flex min-h-[520px] flex-col overflow-hidden rounded-[1.6rem] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              <div className="border-b border-[var(--card-border)] px-5 py-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{copy.chatTitle}</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {selectedFriend?.user.full_name ?? copy.chatEmpty}
                </p>
              </div>

              <div className="flex-1 space-y-3 overflow-auto bg-[var(--bg-secondary)]/55 px-5 py-4">
                {!selectedFriendId ? (
                  <div className="flex h-full items-center justify-center text-center text-sm text-[var(--text-secondary)]">
                    {copy.chatEmpty}
                  </div>
                ) : conversationQuery.isLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-[var(--text-secondary)]">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {copy.loadingMessages}
                  </div>
                ) : conversationQuery.data?.messages.length ? (
                  conversationQuery.data.messages.map((message) => (
                    <div key={message.id} className={`flex ${message.is_own ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-[1.4rem] px-4 py-3 text-sm shadow-sm ${
                          message.is_own
                            ? "bg-emerald-600 text-white"
                            : "border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-6">{message.body}</p>
                        <p className={`mt-2 text-[11px] ${message.is_own ? "text-white/80" : "text-[var(--text-tertiary)]"}`}>
                          {formatDate(message.created_at, locale)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-sm text-[var(--text-secondary)]">
                    {copy.chatEmpty}
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--card-border)] px-5 py-4">
                <div className="flex gap-3">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={copy.chatPlaceholder}
                    disabled={!selectedFriendId || sendMessageMutation.isPending}
                    className="min-h-24 flex-1 rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-emerald-500/40"
                  />
                  <Button
                    type="button"
                    className="self-end rounded-2xl"
                    onClick={() => sendMessageMutation.mutate()}
                    disabled={!selectedFriendId || !draft.trim() || sendMessageMutation.isPending}
                  >
                    {sendMessageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {sendMessageMutation.isPending ? copy.sending : copy.send}
                  </Button>
                </div>
              </div>
            </article>
          </div>
        </div>
      )}

      {overviewQuery.isError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {(overviewQuery.error as Error).message}
        </div>
      ) : null}

      {conversationQuery.isError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {(conversationQuery.error as Error).message}
        </div>
      ) : null}
    </section>
  );
}
