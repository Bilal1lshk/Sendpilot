"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Loader2,
  Mail,
  Lock,
  KeyRound,
  ArrowLeft,
  ShieldCheck,
  RotateCw,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<"request" | "reset" | "done">("request");
  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [senderEmail, setSenderEmail] = useState("contact@mbstack.net");

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to send password reset code.");
        return;
      }

      setSenderEmail(data.senderEmail || "contact@mbstack.net");
      setOtp("");
      setStep("reset");
      toast.success(`Password reset code sent to ${email.trim()}`);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to resend reset code.");
        return;
      }
      toast.success("A new 6-digit reset code has been sent.");
    } catch {
      toast.error("Failed to resend reset code.");
    } finally {
      setIsResending(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: cleanOtp,
          newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to reset password.");
        return;
      }

      setStep("done");
      toast.success("Password updated! Redirecting to sign in...");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
      <div className="flex items-center justify-between">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to sign in</span>
        </Link>
      </div>

      {step === "request" && (
        <>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Account Recovery</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              Forgot your password?
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Enter your account email address and we&apos;ll send a 6-digit verification code from{" "}
              <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                contact@mbstack.net
              </span>{" "}
              to reset your password.
            </p>
          </div>

          <form onSubmit={handleRequestCode} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="reset-email"
                className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400 pointer-events-none" />
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 pl-10 pr-4 py-2.5 text-sm outline-none transition-colors focus:border-neutral-900 dark:focus:border-white focus:bg-white dark:focus:bg-black"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending reset code...</span>
                </>
              ) : (
                "Send 6-Digit Reset Code"
              )}
            </button>
          </form>
        </>
      )}

      {step === "reset" && (
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Verify &amp; Set New Password</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              Reset your password
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Enter the 6-digit code sent from{" "}
              <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                {senderEmail}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {email}
              </span>{" "}
              along with your new password.
            </p>
          </div>


          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="reset-otp"
                className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
              >
                6-Digit Verification Code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400 pointer-events-none" />
                <input
                  id="reset-otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 pl-10 pr-4 py-2.5 text-base font-mono tracking-[0.35em] outline-none transition-colors focus:border-neutral-900 dark:focus:border-white focus:bg-white dark:focus:bg-black"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="new-password"
                className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
              >
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400 pointer-events-none" />
                <input
                  id="new-password"
                  name="newPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 pl-10 pr-11 py-2.5 text-sm outline-none transition-colors focus:border-neutral-900 dark:focus:border-white focus:bg-white dark:focus:bg-black"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirm-password"
                className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400 pointer-events-none" />
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 pl-10 pr-4 py-2.5 text-sm outline-none transition-colors focus:border-neutral-900 dark:focus:border-white focus:bg-white dark:focus:bg-black"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Updating password...</span>
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>

          <div className="flex items-center justify-between text-xs text-neutral-500">
            <button
              type="button"
              onClick={() => setStep("request")}
              className="hover:underline cursor-pointer"
            >
              Change email
            </button>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isResending}
              className="inline-flex items-center gap-1 font-semibold text-neutral-900 dark:text-neutral-100 hover:underline disabled:opacity-50 cursor-pointer"
            >
              <RotateCw className={`h-3 w-3 ${isResending ? "animate-spin" : ""}`} />
              <span>{isResending ? "Resending..." : "Resend code"}</span>
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="py-6 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
              Password Reset Complete
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Your password has been updated. Redirecting you to sign in...
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-2.5 text-sm font-semibold"
          >
            Go to Sign In
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-950">
      <Suspense fallback={null}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
