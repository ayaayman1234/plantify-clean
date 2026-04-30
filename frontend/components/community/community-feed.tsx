"use client";

import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {
  CalendarDays,
  Flag,
  Heart,
  ImagePlus,
  Loader2,
  MessageCircle,
  MessageCircleMore,
  Pencil,
  Plus,
  Reply,
  Search,
  Send,
  ShieldCheck,
  Sprout,
  Trash2,
  Upload,
  UserRound,
  X
} from "lucide-react";
import {useEffect, useMemo, useRef, useState} from "react";
import {useLocale} from "next-intl";

import {Button} from "@/components/ui/button";
import {useRouter} from "@/i18n/navigation";
import {
  fetchSocialOverview,
  createCommunityComment,
  createCommunityPost,
  deleteCommunityComment,
  fetchConversation,
  fetchCommunityPostDetails,
  fetchCommunityPosts,
  fetchCommunityPostSuggestion,
  fetchNormalizedText,
  reportCommunityPost,
  sendFriendRequest,
  sendDirectMessage,
  toggleCommunityCommentLike,
  toggleCommunityPostLike,
  updateCommunityComment
} from "@/lib/api";
import {useAuthSession} from "@/hooks/use-auth-session";
import {formatBoostedConfidence} from "@/lib/confidence";
import {getDashboardCopy} from "@/lib/dashboard-copy";
import type {AppLocale} from "@/i18n/routing";
import type {CommunityComment, CommunityPost, CommunityPostDetail, CommunityPostSuggestion, ConversationData, SocialUser} from "@/lib/types";
import {normalizeUserText} from "@/lib/text-normalization";
import {cn} from "@/lib/utils";

type FeedSort = "newest" | "oldest" | "top";
type CommentSort = "newest" | "oldest";

const PAGE_SIZE = 8;
const SORT_OPTIONS: Array<{value: FeedSort; label: string}> = [
  {value: "newest", label: "Newest"},
  {value: "oldest", label: "Oldest"},
  {value: "top", label: "Top"}
];
const COMMENT_SORT_OPTIONS: Array<{value: CommentSort; label: string}> = [
  {value: "newest", label: "Newest"},
  {value: "oldest", label: "Oldest"}
];

function treatmentLabelForLocale(locale: AppLocale) {
  switch (locale) {
    case "ar":
      return "الحل";
    case "es":
      return "Tratamiento";
    case "hi":
      return "उपचार";
    case "zh":
      return "治疗";
    default:
      return "Treatment";
  }
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {dateStyle: "medium", timeStyle: "short"}).format(new Date(date));
}

function imageSrc(imageB64?: string | null) {
  return imageB64 ? `data:image/jpeg;base64,${imageB64}` : null;
}

function UserBadge({
  name,
  avatarB64,
  subtitle,
  inverse = false,
  onAvatarClick,
  onNameClick
}: {
  name: string;
  avatarB64?: string | null;
  subtitle?: string;
  inverse?: boolean;
  onAvatarClick?: () => void;
  onNameClick?: () => void;
}) {
  const src = imageSrc(avatarB64);
  const Wrapper = onAvatarClick ? "button" : "div";

  return (
    <div className="flex items-center gap-3">
      <Wrapper
        {...(onAvatarClick ? {type: "button", onClick: onAvatarClick} : {})}
        className={cn(
          "group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border transition",
          inverse ? "border-white/20 bg-white/10" : "border-[var(--card-border)] bg-[var(--bg-secondary)]",
          onAvatarClick ? "hover:scale-[1.03]" : "cursor-default"
        )}
      >
        {src ? (
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className={cn("text-sm font-semibold", inverse ? "text-white" : "text-[var(--text-primary)]")}>{name.slice(0, 1).toUpperCase()}</span>
        )}
        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--card-bg)] bg-emerald-500" />
      </Wrapper>
      <div className="min-w-0">
        {onNameClick ? (
          <button
            type="button"
            onClick={onNameClick}
            className={cn("truncate text-left text-sm font-semibold underline-offset-4 hover:underline", inverse ? "text-white" : "text-[var(--text-primary)]")}
          >
            {name}
          </button>
        ) : (
          <p className={cn("truncate text-sm font-semibold", inverse ? "text-white" : "text-[var(--text-primary)]")}>{name}</p>
        )}
        {subtitle ? <p className={cn("truncate text-xs", inverse ? "text-white/80" : "text-[var(--text-secondary)]")}>{subtitle}</p> : null}
      </div>
    </div>
  );
}

function useLiveNormalizedText({
  token,
  value,
  field = "body",
  delay = 300
}: {
  token: string | null;
  value: string;
  field?: "body" | "plant_name";
  delay?: number;
}) {
  const [normalized, setNormalized] = useState(value);

  useEffect(() => {
    setNormalized(value);
    if (!token || !value.trim()) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const next = await fetchNormalizedText({token, text: value, field});
        setNormalized(next);
      } catch {
        setNormalized(normalizeUserText(value, field));
      }
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [delay, field, token, value]);

  return normalized;
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({length: 3}).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)]">
          <div className="h-56 animate-pulse bg-[var(--bg-secondary)]" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-40 animate-pulse rounded-full bg-[var(--bg-secondary)]" />
            <div className="h-7 w-56 animate-pulse rounded-full bg-[var(--bg-secondary)]" />
            <div className="h-4 w-full animate-pulse rounded-full bg-[var(--bg-secondary)]" />
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-[var(--bg-secondary)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({copy}: {copy: ReturnType<typeof getDashboardCopy>["community"]}) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[1.9rem] border border-dashed border-[var(--card-border)] bg-[linear-gradient(145deg,rgba(34,197,94,0.08),rgba(255,255,255,0.92))] px-6 text-center dark:bg-[linear-gradient(145deg,rgba(34,197,94,0.14),rgba(24,24,27,0.92))]">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
        <Sprout className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold text-[var(--text-primary)]">{copy.emptyTitle}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
        {copy.emptyDescription}
      </p>
    </div>
  );
}

function CreatePostComposer({
  onSubmit,
  onSuggest,
  busy,
  suggestBusy,
  token,
  copy
}: {
  onSubmit: (payload: {plantName: string; problem: string; aiDisease: string; aiConfidenceScore: number; image: File}) => Promise<void>;
  onSuggest: (payload: {problem: string; image: File}) => Promise<CommunityPostSuggestion>;
  busy: boolean;
  suggestBusy: boolean;
  token: string | null;
  copy: ReturnType<typeof getDashboardCopy>["community"];
}) {
  const [problem, setProblem] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<CommunityPostSuggestion | null>(null);
  const normalizedProblem = useLiveNormalizedText({token, value: problem, field: "body"});
  const treatmentLabel = treatmentLabelForLocale(useLocale() as AppLocale);

  const validateInputs = () => {
    if (!image || !problem.trim()) {
      setValidationError(copy.validationBoth);
      return false;
    }
    setValidationError(null);
    return true;
  };

  return (
    <section className="rounded-[1.7rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <Plus className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{copy.newPost}</h2>
          <p className="text-sm text-[var(--text-secondary)]">{copy.newPostDescription}</p>
        </div>
      </div>

      <div className="mt-5">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          <ImagePlus className="h-4 w-4" />
          {image ? image.name : copy.chooseImage}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              setImage(event.target.files?.[0] ?? null);
              setSuggestion(null);
            }}
          />
        </label>
      </div>

      <textarea
        value={problem}
        onChange={(event) => {
          setProblem(event.target.value);
          setSuggestion(null);
        }}
        placeholder={copy.problemPlaceholder}
        className="mt-4 min-h-28 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-emerald-500/40"
      />

      {normalizedProblem && normalizedProblem !== problem ? (
        <p className="mt-2 text-xs text-[var(--text-tertiary)]">{copy.normalizedLive}: {normalizedProblem}</p>
      ) : (
        <p className="mt-2 text-xs text-[var(--text-tertiary)]">{copy.normalizedTypingHint}</p>
      )}

      {validationError ? (
        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          {validationError}
        </div>
      ) : null}

      {suggestion ? (
        <div className="mt-4 rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">{copy.suggestionTitle}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-[var(--text-primary)] dark:bg-black/10">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{copy.plant}</p>
              <p className="mt-1 font-semibold">{suggestion.predicted_plant_name}</p>
            </div>
            <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-[var(--text-primary)] dark:bg-black/10">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{copy.disease}</p>
              <p className="mt-1 font-semibold">{suggestion.predicted_disease}</p>
            </div>
            <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-[var(--text-primary)] dark:bg-black/10">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{copy.confidence}</p>
              <p className="mt-1 font-semibold">{formatBoostedConfidence(suggestion.confidence_score)}</p>
            </div>
          </div>
          <div className="mt-3 rounded-2xl bg-white/70 px-4 py-3 text-sm text-[var(--text-primary)] dark:bg-black/10">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{copy.normalizedText}</p>
            <p className="mt-1">{suggestion.normalized_problem}</p>
          </div>
          <div className="mt-3 rounded-2xl bg-white/70 px-4 py-3 text-sm text-[var(--text-primary)] dark:bg-black/10">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{treatmentLabel}</p>
            <p className="mt-1 whitespace-pre-line">{suggestion.treatment_recommendation}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          className="rounded-2xl"
          disabled={suggestBusy}
          onClick={async () => {
            if (!image || !validateInputs()) return;
            try {
              const nextSuggestion = await onSuggest({problem: normalizedProblem.trim() || normalizeUserText(problem.trim(), "body"), image});
              setSuggestion(nextSuggestion);
              setValidationError(null);
            } catch (error) {
              setValidationError((error as Error).message);
            }
          }}
        >
          {suggestBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sprout className="h-4 w-4" />}
          {copy.aiSuggestion}
        </Button>
        <Button
          type="button"
          className="rounded-2xl"
          disabled={busy}
          onClick={async () => {
            if (!image || !validateInputs()) return;
            if (!suggestion) {
              setValidationError(copy.shareValidation);
              return;
            }
            try {
              await onSubmit({
                plantName: suggestion.predicted_plant_name,
                problem: normalizedProblem.trim() || suggestion.normalized_problem,
                aiDisease: suggestion.predicted_disease,
                aiConfidenceScore: suggestion.confidence_score,
                image
              });
              setProblem("");
              setImage(null);
              setSuggestion(null);
              setValidationError(null);
            } catch (error) {
              setValidationError((error as Error).message);
            }
          }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {copy.share}
        </Button>
      </div>
    </section>
  );
}

function FeedCard({
  post,
  onLike,
  onDetails,
  onMessage,
  onReport,
  onOpenProfile,
  currentUserId,
  busy,
  copy
}: {
  post: CommunityPost;
  onLike: (postId: string) => void;
  onDetails: (postId: string) => void;
  onMessage: (user: { id: string; name: string }) => void;
  onReport: (post: CommunityPost) => void;
  onOpenProfile: (user: { id: string; name: string; avatarB64?: string | null; role?: string }, openCard?: boolean) => void;
  currentUserId?: string;
  busy: boolean;
  copy: ReturnType<typeof getDashboardCopy>["community"];
}) {
  const src = imageSrc(post.image_b64);
  const treatmentLabel = treatmentLabelForLocale(useLocale() as AppLocale);

  return (
    <article className="overflow-hidden rounded-[1.9rem] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
      <div className="relative h-60 overflow-hidden bg-[linear-gradient(135deg,#d1fae5,#f0fdf4)]">
        {src ? (
          <img src={src} alt={`${post.ai_plant_name} post`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-emerald-700/80">
            <Sprout className="h-14 w-14" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent p-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <UserBadge
              name={post.user_name}
              avatarB64={post.user_avatar_b64}
              subtitle={post.entry_kind === "community" ? copy.manual : copy.scan}
              inverse
              onAvatarClick={() => onOpenProfile({ id: post.user_id, name: post.user_name, avatarB64: post.user_avatar_b64 }, true)}
              onNameClick={() => onOpenProfile({ id: post.user_id, name: post.user_name, avatarB64: post.user_avatar_b64 }, false)}
            />
            <span className="rounded-full bg-white/15 px-2 py-1 text-[11px] uppercase tracking-[0.16em]">
              {post.entry_kind === "community" ? copy.manual : copy.scan}
            </span>
          </div>
          <h3 className="mt-2 text-2xl font-semibold">{post.ai_plant_name}</h3>
          <p className="mt-1 text-sm text-white/90">{post.post_text}</p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-[var(--bg-secondary)] px-3 py-2 text-sm">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">AI Plant</p>
            <p className="mt-1 font-semibold text-[var(--text-primary)]">{post.ai_plant_name}</p>
          </div>
          <div className="rounded-2xl bg-[var(--bg-secondary)] px-3 py-2 text-sm">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">AI Disease</p>
            <p className="mt-1 font-semibold text-[var(--text-primary)]">{post.ai_disease}</p>
          </div>
          <div className="rounded-2xl bg-[var(--bg-secondary)] px-3 py-2 text-sm">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Confidence</p>
            <p className="mt-1 font-semibold text-[var(--text-primary)]">{formatBoostedConfidence(post.ai_confidence_score)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--bg-secondary)] px-3 py-1.5">
            <CalendarDays className="h-4 w-4" />
            {formatDate(post.created_at)}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--bg-secondary)] px-3 py-1.5">
            <MessageCircle className="h-4 w-4" />
            {post.comments_count} {copy.commentsCount}
          </span>
        </div>

        <p className="text-sm leading-6 text-[var(--text-primary)]">
          <span className="font-semibold">{copy.textLabel}:</span> {post.post_text}
        </p>

        <p className="line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">{treatmentLabel}:</span> {post.ai_treatment_recommendation}
        </p>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant={post.liked_by_current_user ? "success" : "secondary"} className="rounded-2xl" onClick={() => onLike(post.id)} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={cn("h-4 w-4", post.liked_by_current_user && "fill-current")} />}
            {post.likes_count} {copy.likes}
          </Button>

          {post.user_id !== currentUserId ? (
            <Button
              type="button"
              variant="secondary"
              className="rounded-2xl"
              onClick={() => onMessage({ id: post.user_id, name: post.user_name })}
            >
              <MessageCircleMore className="h-4 w-4" />
              Private message
            </Button>
          ) : null}

          {post.user_id !== currentUserId ? (
            <Button type="button" variant="ghost" className="rounded-2xl border border-red-500/20 text-red-600" onClick={() => onReport(post)}>
              <Flag className="h-4 w-4" />
              Report
            </Button>
          ) : null}

          <Button type="button" variant="ghost" className="rounded-2xl border border-[var(--card-border)]" onClick={() => onDetails(post.id)}>
            <MessageCircle className="h-4 w-4" />
            {copy.details}
          </Button>
        </div>
      </div>
    </article>
  );
}

function buildCommentTree(comments: CommunityComment[]) {
  const byParent = new Map<string | null, CommunityComment[]>();
  for (const comment of comments) {
    const key = comment.parent_comment_id ?? null;
    const list = byParent.get(key) ?? [];
    list.push(comment);
    byParent.set(key, list);
  }
  return byParent;
}

function CommentCard({
  comment,
  depth,
  childrenMap,
  editingCommentId,
  editingDraft,
  onEditingDraftChange,
  onStartEdit,
  onSaveEdit,
  onDeleteComment,
  onLikeComment,
  onReply,
  onMessage,
  onOpenProfile,
  currentUserId,
  replyTargetId,
  saveBusyId,
  deleteBusyId,
  commentLikeBusyId,
  copy
}: {
  comment: CommunityComment;
  depth: number;
  childrenMap: Map<string | null, CommunityComment[]>;
  editingCommentId: string | null;
  editingDraft: string;
  onEditingDraftChange: (value: string) => void;
  onStartEdit: (comment: CommunityComment) => void;
  onSaveEdit: () => void;
  onDeleteComment: (commentId: string) => void;
  onLikeComment: (commentId: string) => void;
  onReply: (comment: CommunityComment) => void;
  onMessage: (user: { id: string; name: string }) => void;
  onOpenProfile: (user: { id: string; name: string; avatarB64?: string | null; role?: string }, openCard?: boolean) => void;
  currentUserId?: string;
  replyTargetId: string | null;
  saveBusyId: string | null;
  deleteBusyId: string | null;
  commentLikeBusyId: string | null;
  copy: ReturnType<typeof getDashboardCopy>["community"];
}) {
  const isEditing = editingCommentId === comment.id;
  const replies = childrenMap.get(comment.id) ?? [];

  return (
    <div className={cn("space-y-3", depth > 0 && "ml-6 border-l border-[var(--card-border)] pl-4")}>
      <div
        className={cn(
          "rounded-2xl border p-4",
          comment.is_expert ? "border-emerald-500/25 bg-emerald-500/10" : "border-[var(--card-border)] bg-[var(--bg-secondary)]"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <UserBadge
              name={comment.user_name}
              avatarB64={comment.user_avatar_b64}
              subtitle={comment.user_role}
              onAvatarClick={() => onOpenProfile({ id: comment.user_id, name: comment.user_name, avatarB64: comment.user_avatar_b64, role: comment.user_role }, true)}
              onNameClick={() => onOpenProfile({ id: comment.user_id, name: comment.user_name, avatarB64: comment.user_avatar_b64, role: comment.user_role }, false)}
            />
            {comment.is_expert ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="h-3 w-3" />
                {comment.user_role}
              </span>
            ) : null}
          </div>
          <span className="text-xs text-[var(--text-tertiary)]">{formatDate(comment.created_at)}</span>
        </div>

        {isEditing ? (
          <textarea
            value={editingDraft}
            onChange={(event) => onEditingDraftChange(event.target.value)}
            className="mt-3 min-h-24 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-emerald-500/40"
          />
        ) : (
          <p className="mt-3 text-sm leading-6 text-[var(--text-primary)]">{comment.body}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={comment.liked_by_current_user ? "success" : "secondary"}
            size="sm"
            className="rounded-xl"
            onClick={() => onLikeComment(comment.id)}
            disabled={commentLikeBusyId === comment.id}
          >
            {commentLikeBusyId === comment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={cn("h-4 w-4", comment.liked_by_current_user && "fill-current")} />}
            {comment.likes_count}
          </Button>

          <Button type="button" variant="ghost" size="sm" className={cn("rounded-xl border border-[var(--card-border)]", replyTargetId === comment.id && "border-emerald-500/30 bg-emerald-500/10")} onClick={() => onReply(comment)}>
            <Reply className="h-4 w-4" />
            {copy.reply}
          </Button>

          {comment.user_id !== currentUserId ? (
            <Button type="button" variant="ghost" size="sm" className="rounded-xl border border-[var(--card-border)]" onClick={() => onMessage({ id: comment.user_id, name: comment.user_name })}>
              <MessageCircleMore className="h-4 w-4" />
              Message
            </Button>
          ) : null}

          {comment.is_owner ? (
            <>
              <Button type="button" variant="ghost" size="sm" className="rounded-xl border border-[var(--card-border)]" onClick={isEditing ? onSaveEdit : () => onStartEdit(comment)} disabled={saveBusyId === comment.id}>
                {saveBusyId === comment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? <Upload className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                {isEditing ? copy.save : copy.edit}
              </Button>
              <Button type="button" variant="ghost" size="sm" className="rounded-xl border border-red-500/20 text-red-600" onClick={() => onDeleteComment(comment.id)} disabled={deleteBusyId === comment.id}>
                {deleteBusyId === comment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {copy.delete}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {replies.map((reply) => (
        <CommentCard
          key={reply.id}
          comment={reply}
          depth={depth + 1}
          childrenMap={childrenMap}
          editingCommentId={editingCommentId}
          editingDraft={editingDraft}
          onEditingDraftChange={onEditingDraftChange}
          onStartEdit={onStartEdit}
          onSaveEdit={onSaveEdit}
          onDeleteComment={onDeleteComment}
          onLikeComment={onLikeComment}
          onReply={onReply}
          onMessage={onMessage}
          onOpenProfile={onOpenProfile}
          currentUserId={currentUserId}
          replyTargetId={replyTargetId}
          saveBusyId={saveBusyId}
          deleteBusyId={deleteBusyId}
          commentLikeBusyId={commentLikeBusyId}
          copy={copy}
        />
      ))}
    </div>
  );
}

function DetailsPanel({
  post,
  open,
  onClose,
  commentValue,
  onCommentChange,
  onSubmitComment,
  commentBusy,
  commentSort,
  onCommentSortChange,
  replyTarget,
  onClearReply,
  editingCommentId,
  editingDraft,
  onEditingDraftChange,
  onStartEdit,
  onSaveEdit,
  onDeleteComment,
  onLikeComment,
  onReply,
  onMessageUser,
  onOpenProfile,
  currentUserId,
  saveBusyId,
  deleteBusyId,
  commentLikeBusyId,
  copy
}: {
  post: CommunityPostDetail | undefined;
  open: boolean;
  onClose: () => void;
  commentValue: string;
  onCommentChange: (value: string) => void;
  onSubmitComment: () => void;
  commentBusy: boolean;
  commentSort: CommentSort;
  onCommentSortChange: (value: CommentSort) => void;
  replyTarget: CommunityComment | null;
  onClearReply: () => void;
  editingCommentId: string | null;
  editingDraft: string;
  onEditingDraftChange: (value: string) => void;
  onStartEdit: (comment: CommunityComment) => void;
  onSaveEdit: () => void;
  onDeleteComment: (commentId: string) => void;
  onLikeComment: (commentId: string) => void;
  onReply: (comment: CommunityComment) => void;
  onMessageUser: (user: { id: string; name: string }) => void;
  onOpenProfile: (user: { id: string; name: string; avatarB64?: string | null; role?: string }, openCard?: boolean) => void;
  currentUserId?: string;
  saveBusyId: string | null;
  deleteBusyId: string | null;
  commentLikeBusyId: string | null;
  copy: ReturnType<typeof getDashboardCopy>["community"];
}) {
  if (!open) return null;

  const childrenMap = buildCommentTree(post?.comments ?? []);
  const rootComments = childrenMap.get(null) ?? [];
  const treatmentLabel = treatmentLabelForLocale(useLocale() as AppLocale);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-0 md:items-center md:p-6">
      <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[2rem] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl md:h-[88vh] md:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-5 py-4">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">{post ? post.user_name : copy.loadingPostDetails}</p>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">{post ? `${post.ai_plant_name} - ${post.post_text}` : copy.details}</h2>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!post ? (
          <div className="flex flex-1 items-center justify-center text-[var(--text-secondary)]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {copy.loadingPostDetails}
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1fr,1fr]">
            <div className="min-h-0 overflow-auto border-b border-[var(--card-border)] lg:border-b-0 lg:border-r">
              <div className="bg-[linear-gradient(135deg,#d1fae5,#f0fdf4)]">
                {post.image_b64 ? (
                  <img src={imageSrc(post.image_b64) ?? ""} alt={post.ai_plant_name} className="h-[320px] w-full object-cover" />
                ) : (
                  <div className="flex h-[320px] items-center justify-center text-emerald-700/80">
                    <Sprout className="h-16 w-16" />
                  </div>
                )}
              </div>

              <div className="space-y-4 p-5">
                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                  <span>{formatDate(post.created_at)}</span>
                  <span>{post.likes_count} {copy.likes.toLowerCase()}</span>
                  <span>{post.comments_count} {copy.commentsCount}</span>
                </div>

                <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--bg-secondary)] p-4">
                  <p className="mb-3 text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Posted by</p>
                  <UserBadge
                    name={post.user_name}
                    avatarB64={post.user_avatar_b64}
                    subtitle={post.user_id !== currentUserId ? "Tap the name to view profile" : "This is your post"}
                    onAvatarClick={() => onOpenProfile({ id: post.user_id, name: post.user_name, avatarB64: post.user_avatar_b64 }, true)}
                    onNameClick={() => onOpenProfile({ id: post.user_id, name: post.user_name, avatarB64: post.user_avatar_b64 }, false)}
                  />
                </div>

                <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--bg-secondary)] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{copy.textLabel}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{post.post_text}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--bg-secondary)] p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{copy.plant}</p>
                    <p className="mt-2 font-semibold text-[var(--text-primary)]">{post.ai_plant_name}</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--bg-secondary)] p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{copy.disease}</p>
                    <p className="mt-2 font-semibold text-[var(--text-primary)]">{post.ai_disease}</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--bg-secondary)] p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{copy.confidence}</p>
                    <p className="mt-2 font-semibold text-[var(--text-primary)]">{formatBoostedConfidence(post.ai_confidence_score)}</p>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--bg-secondary)] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{treatmentLabel}</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--text-primary)]">{post.ai_treatment_recommendation}</p>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--card-border)] px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{copy.commentsTitle}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{copy.commentsDescription}</p>
                </div>
                <div className="flex gap-2">
                  {COMMENT_SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onCommentSortChange(option.value)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                        commentSort === option.value
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                      )}
                    >
                      {option.value === "newest" ? copy.sortNewest : copy.sortOldest}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
                {rootComments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
                    {copy.noComments}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rootComments.map((comment) => (
                      <CommentCard
                        key={comment.id}
                        comment={comment}
                        depth={0}
                        childrenMap={childrenMap}
                        editingCommentId={editingCommentId}
                        editingDraft={editingDraft}
                        onEditingDraftChange={onEditingDraftChange}
                        onStartEdit={onStartEdit}
                        onSaveEdit={onSaveEdit}
                        onDeleteComment={onDeleteComment}
                        onLikeComment={onLikeComment}
                        onReply={onReply}
                        onMessage={onMessageUser}
                        onOpenProfile={onOpenProfile}
                        currentUserId={currentUserId}
                        replyTargetId={replyTarget?.id ?? null}
                        saveBusyId={saveBusyId}
                        deleteBusyId={deleteBusyId}
                        commentLikeBusyId={commentLikeBusyId}
                        copy={copy}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--card-border)] px-5 py-4">
                {replyTarget ? (
                  <div className="mb-3 flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                    <span>{copy.replyTo} {replyTarget.user_name}</span>
                    <button type="button" onClick={onClearReply} className="font-semibold">
                      {copy.cancel}
                    </button>
                  </div>
                ) : null}
                <textarea
                  value={commentValue}
                  onChange={(event) => onCommentChange(event.target.value)}
                  placeholder={replyTarget ? copy.replyPlaceholder.replace("{name}", replyTarget.user_name) : copy.commentPlaceholder}
                  className="min-h-24 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500/40"
                />
                <p className="mt-2 text-xs text-[var(--text-tertiary)]">{copy.commentNormalizedHint}</p>
                <div className="mt-3 flex justify-end">
                  <Button type="button" className="rounded-2xl" onClick={onSubmitComment} disabled={commentBusy || commentValue.trim().length === 0}>
                    {commentBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                    {replyTarget ? copy.reply : copy.addComment}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UserSpotlightPanel({
  open,
  user,
  onClose,
  onMessage,
  onViewProfile,
  onAddFriend,
  addingFriend
}: {
  open: boolean;
  user: (SocialUser & { role?: string }) | null;
  onClose: () => void;
  onMessage: () => void;
  onViewProfile: () => void;
  onAddFriend: () => void;
  addingFriend: boolean;
}) {
  if (!open || !user) return null;

  const friendshipLabel =
    user.friendship_status === "friend"
      ? "Friends"
      : user.friendship_status === "pending_sent"
        ? "Friend request sent"
        : user.friendship_status === "pending_received"
          ? "Sent you a request"
          : "Open to connect";

  return (
    <div className="fixed inset-0 z-[96] flex items-end justify-center bg-black/45 p-0 md:items-center md:p-6">
      <div className="w-full max-w-md rounded-t-[2rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-2xl md:rounded-[2rem]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)]">
                {user.avatar_b64 ? <img src={imageSrc(user.avatar_b64) ?? ""} alt={user.full_name} className="h-full w-full object-cover" /> : <span className="text-2xl font-semibold text-[var(--text-primary)]">{user.full_name.slice(0, 1).toUpperCase()}</span>}
              </div>
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-[var(--card-bg)] bg-emerald-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">{user.full_name}</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{user.role}</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Private chat available</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 rounded-[1.4rem] border border-[var(--card-border)] bg-[var(--bg-secondary)] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Connection</p>
          <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{friendshipLabel}</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" className="rounded-2xl" onClick={onMessage}>
            <MessageCircleMore className="h-4 w-4" />
            Message
          </Button>
          <Button type="button" variant="secondary" className="rounded-2xl" onClick={onViewProfile}>
            <UserRound className="h-4 w-4" />
            View Profile
          </Button>
          {user.friendship_status === "none" ? (
            <Button type="button" variant="secondary" className="rounded-2xl" onClick={onAddFriend} disabled={addingFriend}>
              {addingFriend ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Friend
            </Button>
          ) : null}
        </div>
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
  conversation,
  loading
}: {
  open: boolean;
  title: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onClose: () => void;
  onSend: () => void;
  sending: boolean;
  conversation?: ConversationData;
  loading: boolean;
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
          ) : conversation?.messages.length ? (
            conversation.messages.map((message) => (
              <div key={message.id} className={`flex ${message.is_own ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] rounded-[1.4rem] px-4 py-3 text-sm shadow-sm ${message.is_own ? "bg-emerald-600 text-white" : "border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"}`}>
                  <p className="whitespace-pre-wrap leading-6">{message.body}</p>
                  <p className={`mt-2 text-[11px] ${message.is_own ? "text-white/80" : "text-[var(--text-tertiary)]"}`}>{formatDate(message.created_at)}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm text-[var(--text-secondary)]">
              Start a private conversation from the community.
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

export function CommunityFeed() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const locale = useLocale() as AppLocale;
  const copy = getDashboardCopy(locale).community;
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const {token, profile} = useAuthSession();
  const [sort, setSort] = useState<FeedSort>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentSort, setCommentSort] = useState<CommentSort>("newest");
  const [commentValue, setCommentValue] = useState("");
  const [replyTarget, setReplyTarget] = useState<CommunityComment | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [messageTarget, setMessageTarget] = useState<{ id: string; name: string } | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [spotlightUser, setSpotlightUser] = useState<{ id: string; name: string; avatarB64?: string | null; role?: string } | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const normalizedCommentValue = useLiveNormalizedText({token, value: commentValue, field: "body"});
  const normalizedEditingDraft = useLiveNormalizedText({token, value: editingDraft, field: "body"});

  const postsQuery = useInfiniteQuery({
    queryKey: ["community-posts", sort, token],
    queryFn: async ({pageParam = 0}) => fetchCommunityPosts({token: token ?? "", sort, offset: pageParam, limit: PAGE_SIZE}),
    getNextPageParam: (lastPage) => lastPage.next_offset ?? undefined,
    initialPageParam: 0,
    enabled: Boolean(token)
  });

  const detailsQuery = useQuery({
    queryKey: ["community-post-details", selectedPostId, commentSort, token],
    queryFn: async () => fetchCommunityPostDetails({token: token ?? "", postId: selectedPostId ?? "", commentSort}),
    enabled: Boolean(token && selectedPostId)
  });

  const socialOverviewQuery = useQuery({
    queryKey: ["community-social-overview", token],
    queryFn: async () => fetchSocialOverview(token ?? ""),
    enabled: Boolean(token)
  });

  const privateConversationQuery = useQuery({
    queryKey: ["community-private-conversation", messageTarget?.id, token],
    queryFn: async () => fetchConversation({ token: token ?? "", friendId: messageTarget?.id ?? "" }),
    enabled: Boolean(token && messageTarget?.id)
  });

  const likeMutation = useMutation({
    mutationFn: async (postId: string) => toggleCommunityPostLike({token: token ?? "", postId}),
    onSuccess: async (updatedPost) => {
      await queryClient.invalidateQueries({queryKey: ["community-posts"]});
      queryClient.setQueryData<CommunityPostDetail | undefined>(["community-post-details", updatedPost.id, commentSort, token], (current) =>
        current ? {...current, ...updatedPost} : current
      );
    }
  });

  const createPostMutation = useMutation({
    mutationFn: async (payload: {plantName: string; problem: string; aiDisease: string; aiConfidenceScore: number; image: File}) =>
      createCommunityPost({token: token ?? "", ...payload}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["community-posts"]});
    }
  });

  const suggestionMutation = useMutation({
    mutationFn: async (payload: {problem: string; image: File}) => fetchCommunityPostSuggestion({token: token ?? "", ...payload})
  });

  const commentMutation = useMutation({
    mutationFn: async () =>
      createCommunityComment({
        token: token ?? "",
        postId: selectedPostId ?? "",
        body: normalizedCommentValue.trim() || commentValue.trim(),
        parentCommentId: replyTarget?.id ?? null
      }),
    onSuccess: async (updatedPost) => {
      setCommentValue("");
      setReplyTarget(null);
      queryClient.setQueryData(["community-post-details", updatedPost.id, commentSort, token], updatedPost);
      await queryClient.invalidateQueries({queryKey: ["community-posts"]});
    }
  });

  const editCommentMutation = useMutation({
    mutationFn: async () =>
      updateCommunityComment({
        token: token ?? "",
        commentId: editingCommentId ?? "",
        body: normalizedEditingDraft.trim() || editingDraft.trim()
      }),
    onSuccess: async (updatedPost) => {
      setEditingCommentId(null);
      setEditingDraft("");
      queryClient.setQueryData(["community-post-details", updatedPost.id, commentSort, token], updatedPost);
      await queryClient.invalidateQueries({queryKey: ["community-posts"]});
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => deleteCommunityComment({token: token ?? "", commentId}),
    onSuccess: async (updatedPost) => {
      queryClient.setQueryData(["community-post-details", updatedPost.id, commentSort, token], updatedPost);
      await queryClient.invalidateQueries({queryKey: ["community-posts"]});
    }
  });

  const commentLikeMutation = useMutation({
    mutationFn: async (commentId: string) => toggleCommunityCommentLike({token: token ?? "", commentId}),
    onSuccess: async (updatedPost) => {
      queryClient.setQueryData(["community-post-details", updatedPost.id, commentSort, token], updatedPost);
    }
  });

  const privateMessageMutation = useMutation({
    mutationFn: async () => sendDirectMessage({ token: token ?? "", receiverId: messageTarget?.id ?? "", body: messageDraft }),
    onSuccess: async () => {
      setMessageDraft("");
      await queryClient.invalidateQueries({ queryKey: ["community-private-conversation", messageTarget?.id, token] });
    }
  });

  const friendRequestMutation = useMutation({
    mutationFn: async (receiverId: string) => sendFriendRequest({ token: token ?? "", receiverId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["community-social-overview", token] });
    }
  });
  const reportPostMutation = useMutation({
    mutationFn: async (input: {postId: string; reason: string}) => reportCommunityPost({token: token ?? "", ...input}),
    onSuccess: () => {
      setReportError(null);
      setReportMessage("Your report was sent to the admin.");
    },
    onError: (error: Error) => {
      setReportMessage(null);
      setReportError(error.message);
    }
  });

  const posts = postsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const filteredPosts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return posts;
    }

    return posts.filter((post) =>
      [
        post.user_name,
        post.post_text,
        post.ai_plant_name,
        post.ai_disease,
        post.ai_treatment_recommendation,
        post.entry_kind
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [posts, searchQuery]);
  const canCreatePosts = Boolean(profile?.can_create_posts || profile?.role === "admin" || profile?.role === "developer");
  const socialUsers = new Map<string, SocialUser>();
  for (const user of socialOverviewQuery.data?.discoverable_users ?? []) {
    socialUsers.set(user.id, user);
  }
  for (const friend of socialOverviewQuery.data?.friends ?? []) {
    socialUsers.set(friend.user.id, friend.user);
  }
  for (const request of socialOverviewQuery.data?.received_requests ?? []) {
    socialUsers.set(request.sender.id, request.sender);
    socialUsers.set(request.receiver.id, request.receiver);
  }
  for (const request of socialOverviewQuery.data?.sent_requests ?? []) {
    socialUsers.set(request.sender.id, request.sender);
    socialUsers.set(request.receiver.id, request.receiver);
  }
  const spotlightSocialUser = spotlightUser
    ? socialUsers.get(spotlightUser.id) ?? {
        id: spotlightUser.id,
        full_name: spotlightUser.name,
        avatar_b64: spotlightUser.avatarB64,
        role: (spotlightUser.role as SocialUser["role"]) ?? "farmer",
        friendship_status: "none",
        pending_request_id: null
      }
    : null;

  useEffect(() => {
    if (!loadMoreRef.current || !postsQuery.hasNextPage || postsQuery.isFetchingNextPage) return;
    const element = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          postsQuery.fetchNextPage();
        }
      },
      {rootMargin: "240px"}
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [postsQuery.hasNextPage, postsQuery.isFetchingNextPage, postsQuery.fetchNextPage]);

  if (!token) {
    return <div className="flex min-h-[320px] items-center justify-center rounded-[1.8rem] border border-[var(--card-border)] bg-[var(--card-bg)] px-6 text-center text-[var(--text-secondary)]">{copy.signIn}</div>;
  }

  return (
    <>
      <section className="space-y-6">
        {canCreatePosts ? (
          <CreatePostComposer
            onSubmit={async (payload) => {
              await createPostMutation.mutateAsync(payload);
            }}
            onSuggest={(payload) => suggestionMutation.mutateAsync(payload)}
            busy={createPostMutation.isPending}
            suggestBusy={suggestionMutation.isPending}
            token={token}
            copy={copy}
          />
        ) : (
          <section className="rounded-[1.7rem] border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-800 dark:text-amber-300">
            Community posting is currently disabled for your account. An admin decides who can publish posts. If you applied as an expert, wait for admin approval.
          </section>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.7rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{copy.feedTitle}</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{copy.feedDescription}</p>
          </div>

          <div className="flex flex-col gap-3 lg:min-w-[380px]">
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-3">
              <Search className="h-4 w-4 text-[var(--text-tertiary)]" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search posts, plants, diseases, or users..."
                className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSort(option.value)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition",
                    sort === option.value ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                  )}
                >
                  {option.value === "newest" ? copy.sortNewest : option.value === "oldest" ? copy.sortOldest : copy.sortTop}
                </button>
              ))}
            </div>
          </div>
        </div>

        {postsQuery.isLoading ? (
          <FeedSkeleton />
        ) : filteredPosts.length > 0 ? (
          <>
            <div className="grid gap-5 xl:grid-cols-2">
              {filteredPosts.map((post: CommunityPost) => (
                <FeedCard
                  key={post.id}
                  post={post}
                  onLike={(postId) => likeMutation.mutate(postId)}
                  onMessage={(user) => setMessageTarget(user)}
                  onReport={(targetPost) => {
                    const reason = window.prompt("Why are you reporting this post?");
                    if (!reason || !reason.trim()) return;
                    setReportMessage(null);
                    setReportError(null);
                    reportPostMutation.mutate({postId: targetPost.id, reason: reason.trim()});
                  }}
                  onOpenProfile={(user, openCard = false) => {
                    if (openCard) {
                      setSpotlightUser(user);
                      return;
                    }
                    router.push(`/profile/${user.id}`);
                  }}
                  onDetails={(postId) => {
                    setSelectedPostId(postId);
                    setCommentSort("newest");
                    setReplyTarget(null);
                    setEditingCommentId(null);
                    setEditingDraft("");
                  }}
                  copy={copy}
                  currentUserId={profile?.id}
                  busy={likeMutation.isPending && likeMutation.variables === post.id}
                />
              ))}
            </div>

            <div ref={loadMoreRef} className="flex justify-center pt-2">
              {postsQuery.hasNextPage ? (
                <Button type="button" variant="secondary" className="rounded-2xl" onClick={() => postsQuery.fetchNextPage()} disabled={postsQuery.isFetchingNextPage}>
                  {postsQuery.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {copy.loadMore}
                </Button>
              ) : (
                <span className="text-sm text-[var(--text-tertiary)]">{copy.endOfFeed}</span>
              )}
            </div>
          </>
        ) : (
          searchQuery.trim() ? (
            <div className="rounded-[1.75rem] border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] px-6 py-14 text-center text-sm text-[var(--text-secondary)]">
              No community posts matched your search.
            </div>
          ) : (
            <EmptyState copy={copy} />
          )
        )}

        {postsQuery.isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {(postsQuery.error as Error).message}
          </div>
        ) : null}

        {reportMessage ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {reportMessage}
          </div>
        ) : null}

        {reportError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {reportError}
          </div>
        ) : null}

        {suggestionMutation.isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {(suggestionMutation.error as Error).message}
          </div>
        ) : null}
      </section>

      <DetailsPanel
        open={selectedPostId !== null}
        post={detailsQuery.data}
        copy={copy}
        onClose={() => {
          setSelectedPostId(null);
          setCommentValue("");
          setReplyTarget(null);
          setEditingCommentId(null);
          setEditingDraft("");
        }}
        commentValue={commentValue}
        onCommentChange={setCommentValue}
        onSubmitComment={() => commentMutation.mutate()}
        commentBusy={commentMutation.isPending}
        commentSort={commentSort}
        onCommentSortChange={setCommentSort}
        replyTarget={replyTarget}
        onClearReply={() => setReplyTarget(null)}
        editingCommentId={editingCommentId}
        editingDraft={editingDraft}
        onEditingDraftChange={setEditingDraft}
        onStartEdit={(comment) => {
          if (comment.user_id !== profile?.id) return;
          setEditingCommentId(comment.id);
          setEditingDraft(comment.body);
        }}
        onSaveEdit={() => editCommentMutation.mutate()}
        onDeleteComment={(commentId) => deleteCommentMutation.mutate(commentId)}
        onLikeComment={(commentId) => commentLikeMutation.mutate(commentId)}
        onReply={(comment) => {
          setReplyTarget(comment);
          setEditingCommentId(null);
        }}
        onMessageUser={(user) => setMessageTarget(user)}
        onOpenProfile={(user, openCard = false) => {
          if (openCard) {
            setSpotlightUser(user);
            return;
          }
          router.push(`/profile/${user.id}`);
        }}
        currentUserId={profile?.id}
        saveBusyId={editCommentMutation.isPending ? editingCommentId : null}
        deleteBusyId={deleteCommentMutation.isPending ? deleteCommentMutation.variables ?? null : null}
        commentLikeBusyId={commentLikeMutation.isPending ? commentLikeMutation.variables ?? null : null}
      />

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
        conversation={privateConversationQuery.data}
        loading={privateConversationQuery.isLoading}
      />

      <UserSpotlightPanel
        open={spotlightUser !== null}
        user={spotlightSocialUser}
        onClose={() => setSpotlightUser(null)}
        onMessage={() => {
          if (!spotlightUser) return;
          setMessageTarget({ id: spotlightUser.id, name: spotlightUser.name });
          setSpotlightUser(null);
        }}
        onViewProfile={() => {
          if (!spotlightUser) return;
          router.push(`/profile/${spotlightUser.id}`);
          setSpotlightUser(null);
        }}
        onAddFriend={() => {
          if (!spotlightUser) return;
          friendRequestMutation.mutate(spotlightUser.id);
        }}
        addingFriend={friendRequestMutation.isPending}
      />
    </>
  );
}
