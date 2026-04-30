"use client";

import {ArrowRight, Check, Loader2} from "lucide-react";
import Link from "next/link";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {FormEvent, useState} from "react";
import {motion} from "framer-motion";

import {signup} from "@/lib/api";
import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import {FloatingField} from "@/components/auth/floating-field";

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState<"farmer" | "expert">("farmer");
  const [headline, setHeadline] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [about, setAbout] = useState("");
  const [credentials, setCredentials] = useState("");
  const [yearsExperience, setYearsExperience] = useState("0");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setSuccess(false);
    setError(null);

    if (password !== confirmPassword) {
      setError(t("register.passwordMismatch"));
      setLoading(false);
      return;
    }

    if (accountType === "expert" && (!headline.trim() || !phoneNumber.trim() || !about.trim() || !credentials.trim())) {
      setError("Please complete your expert profile before submitting.");
      setLoading(false);
      return;
    }

    try {
      await signup({
        email,
        password,
        full_name: username,
        account_type: accountType,
        expert_application: accountType === "expert" ? {
          headline: headline.trim(),
          phone_number: phoneNumber.trim(),
          about: about.trim(),
          credentials: credentials.trim(),
          years_experience: Number(yearsExperience || "0")
        } : undefined
      });
      setSuccess(true);
      // Expert accounts start as farmer with pending status awaiting admin approval.
      // Give the user time to read the success/pending message before redirecting.
      setTimeout(() => router.push("/login"), accountType === "expert" ? 3000 : 450);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("register.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-[calc(100vh-90px)] overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-8rem] top-8 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-[-8rem] h-80 w-80 rounded-full bg-zinc-500/10 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-90px)] w-full max-w-md items-center px-4 py-10">
        <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{duration: 0.35}} className="w-full">
          <Card className="w-full rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-7 shadow-[var(--shadow-md)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">{t("register.title")}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("register.subtitle")}</p>

            <form onSubmit={onSubmit} className="mt-6 space-y-3">
              <FloatingField
                label={t("common.username")}
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
              <FloatingField
                label={t("common.email")}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <p className="-mt-1 text-xs text-[var(--text-tertiary)]">{t("common.emailHint")}</p>
              <FloatingField
                label={t("common.password")}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <FloatingField
                label={t("common.confirmPassword")}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] p-3">
                <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">Choose your role</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setAccountType("farmer")}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${accountType === "farmer" ? "border-emerald-500/40 bg-emerald-500/10 text-[var(--text-primary)]" : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)]"}`}
                  >
                    <p className="font-semibold">Farmer</p>
                    <p className="mt-1 text-xs">Use the platform normally.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType("expert")}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${accountType === "expert" ? "border-emerald-500/40 bg-emerald-500/10 text-[var(--text-primary)]" : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)]"}`}
                  >
                    <p className="font-semibold">Expert</p>
                    <p className="mt-1 text-xs">Apply as a doctor or agricultural expert for admin review.</p>
                  </button>
                </div>
              </div>

              {accountType === "expert" ? (
                <div className="space-y-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Expert application</p>
                  <FloatingField
                    label="Headline"
                    value={headline}
                    onChange={(event) => setHeadline(event.target.value)}
                    required
                  />
                  <FloatingField
                    label="Phone number"
                    type="tel"
                    autoComplete="tel"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    required
                  />
                  <textarea
                    value={about}
                    onChange={(event) => setAbout(event.target.value)}
                    placeholder="Tell us about your specialty, background, and how you help farmers."
                    className="min-h-28 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-emerald-500/40"
                    required
                  />
                  <textarea
                    value={credentials}
                    onChange={(event) => setCredentials(event.target.value)}
                    placeholder="Degrees, licenses, certifications, clinic or institution details."
                    className="min-h-24 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-emerald-500/40"
                    required
                  />
                  <FloatingField
                    label="Years of experience"
                    type="number"
                    min={0}
                    value={yearsExperience}
                    onChange={(event) => setYearsExperience(event.target.value)}
                    required
                  />
                  <p className="text-xs text-[var(--text-tertiary)]">Your account will stay pending until an admin reviews and approves it.</p>
                </div>
              ) : null}
              <p className="-mt-1 text-xs text-[var(--text-tertiary)]">{t("register.passwordRule")}</p>

              <Button type="submit" className="mt-1 h-11 w-full gap-2 bg-[#22c55e] text-zinc-50 hover:bg-[#16a34a] active:scale-[0.98]" disabled={loading || success}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("register.loading")}
                  </>
                ) : success ? (
                  <>
                    <Check className="h-4 w-4" />
                    {accountType === "expert" ? "Application submitted!" : t("register.success")}
                  </>
                ) : (
                  <>
                    {t("register.cta")}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              {success && accountType === "expert" ? (
                <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                  ⏳ Your expert application is <strong>pending admin review</strong>. You can log in now — your account will appear as <strong>Farmer</strong> until an admin approves your application.
                </p>
              ) : null}
              {error ? <p className="rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#ef4444]">{error}</p> : null}
            </form>

            <p className="mt-5 text-sm text-[var(--text-secondary)]">
              {t("register.switchPrompt")} <Link href="/login" className="font-semibold text-[#22c55e] hover:underline">{t("register.switchCta")}</Link>
            </p>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
