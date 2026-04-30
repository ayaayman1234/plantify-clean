"use client";

import {ArrowRight, Check, Loader2} from "lucide-react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {FormEvent, useState} from "react";
import {motion} from "framer-motion";

import {FloatingField} from "@/components/auth/floating-field";
import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import {requestPasswordResetCode, resetPasswordWithCode} from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      if (!codeSent) {
        await requestPasswordResetCode(email);
        setCodeSent(true);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      await resetPasswordWithCode({email, code, newPassword});
      setSuccess(true);
      setTimeout(() => router.push("/login"), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-[calc(100vh-90px)] overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-[-9rem] h-80 w-80 rounded-full bg-zinc-500/10 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-90px)] w-full max-w-md items-center px-4 py-10">
        <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{duration: 0.35}} className="w-full">
          <Card className="w-full rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-7 shadow-[var(--shadow-md)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Forgot password</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {!codeSent ? "Enter your email to receive a reset code." : "Enter the code sent to your email and choose a new password."}
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-3">
              <FloatingField
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              {codeSent ? (
                <>
                  <FloatingField
                    label="Reset code"
                    type="text"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    required
                  />
                  <FloatingField
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                  />
                  <FloatingField
                    label="Confirm password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </>
              ) : null}

              <Button type="submit" className="mt-1 h-11 w-full gap-2 bg-[#22c55e] text-zinc-50 hover:bg-[#16a34a] active:scale-[0.98]">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {codeSent ? "Updating..." : "Sending code..."}
                  </>
                ) : success ? (
                  <>
                    <Check className="h-4 w-4" />
                    Updated
                  </>
                ) : (
                  <>
                    {codeSent ? "Reset password" : "Send code"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              {codeSent ? <p className="text-xs text-[var(--text-tertiary)]">Check your Gmail inbox for the 6-digit code.</p> : null}
              {error ? <p className="rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#ef4444]">{error}</p> : null}
            </form>

            <p className="mt-5 text-sm text-[var(--text-secondary)]">
              Remembered it? <Link href="/login" className="font-semibold text-[#22c55e] hover:underline">Back to login</Link>
            </p>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
