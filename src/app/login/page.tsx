"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Loader2,
  Mail,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
  RotateCw,
  KeyRound,
} from "lucide-react";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { Globe } from "@/components/ui/globe";

function AuthErrorMessage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (!error) return null;

  let message = "An error occurred during authentication. Please try again.";
  if (error === "OAuthSignin" || error === "OAuthCallbackError") {
    message = "Could not sign in with provider. Please ensure provider credentials are configured.";
  } else if (error === "OAuthAccountNotLinked") {
    message = "An account already exists with this email address using another sign-in method.";
  } else if (error === "DatabaseError") {
    message = "Database connection failed. Please ensure your IP address is whitelisted in MongoDB Atlas (Network Access -> Add IP Address).";
  } else if (error === "AccessDenied") {
    message = "Access was denied by the provider. Please verify that your email is added to 'Test Users' in Google Cloud Console, or check your MongoDB Atlas IP whitelist.";
  }

  return (
    <div
      role="alert"
      className="flex items-center gap-2.5 p-3.5 text-xs rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [senderEmail, setSenderEmail] = useState("contact@mbstack.net");
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.error || "Invalid email or password");
        return;
      }

      setSenderEmail(data.senderEmail || "contact@mbstack.net");
      setPreviewCode(data.previewCode || null);
      setOtp("");
      setStep("otp");
      toast.success(`Verification code sent to ${email.trim()}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    try {
      const res = await fetch("/api/auth/login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to resend verification code");
        return;
      }
      setPreviewCode(data.previewCode || null);
      toast.success("A new 6-digit verification code has been sent.");
    } catch {
      toast.error("Failed to resend verification code.");
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        otp: cleanOtp,
        redirect: false,
      });

      if (res?.error) {
        toast.error("Invalid or expired verification code. Please try again.");
      } else {
        toast.success("Verified and signed in successfully!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen max-h-screen w-full flex overflow-hidden bg-neutral-50 dark:bg-[#0c0d0e] text-neutral-900 dark:text-neutral-50 selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* ── Left Column: Clean & Unobstructed Sign In Form ─────────────── */}
      <div className="w-full lg:w-[48%] xl:w-[44%] h-full flex flex-col justify-between p-6 sm:p-8 lg:p-10 xl:p-12 z-10 bg-white dark:bg-[#0f1112] border-r border-neutral-200/80 dark:border-neutral-800/80 overflow-y-auto lg:overflow-hidden">
        {/* Top bar: Brand */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-bold tracking-tight text-lg text-neutral-900 dark:text-white hover:opacity-85 transition-opacity"
            aria-label="SendPilot Home"
          >
            <div className="h-9 w-9 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shadow-xs">
              S
            </div>
            <span>SendPilot</span>
          </Link>

          <Link
            href="/"
            className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            ← Back to home
          </Link>
        </div>

        {/* Center: The Form Container */}
        <div className="w-full max-w-[400px] mx-auto my-auto py-8 space-y-6">
          {step === "credentials" ? (
            <>
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                  Welcome back
                </h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Enter your credentials to receive a sign-in verification code
                </p>
              </div>

              <Suspense fallback={null}>
                <AuthErrorMessage />
              </Suspense>

              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400 pointer-events-none" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      inputMode="email"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/60 pl-10 pr-4 py-2.5 text-sm outline-none transition-colors focus:border-neutral-900 dark:focus:border-white focus:bg-white dark:focus:bg-black focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
                    >
                      Password
                    </label>
                    <Link
                      href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400 pointer-events-none" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/60 pl-10 pr-11 py-2.5 text-sm outline-none transition-colors focus:border-neutral-900 dark:focus:border-white focus:bg-white dark:focus:bg-black focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-2.5 text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending verification code...</span>
                    </>
                  ) : (
                    "Continue with OTP"
                  )}
                </button>
              </form>

              <SocialAuthButtons disabled={isLoading} />

              <p className="text-center text-xs text-neutral-500 dark:text-neutral-400 pt-1">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-neutral-900 dark:text-neutral-100 underline underline-offset-2 hover:opacity-80"
                >
                  Create one
                </Link>
              </p>
            </>
          ) : (
            /* ── Step 2: 6-Digit OTP Verification ─────────────────────── */
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => setStep("credentials")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to credentials</span>
              </button>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>2-Step Verification</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                  Enter verification code
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  We sent a 6-digit code from{" "}
                  <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                    {senderEmail}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {email}
                  </span>
                  .
                </p>
              </div>

              {previewCode && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-700 dark:text-amber-300">
                      SMTP Preview Mode ({senderEmail})
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtp(previewCode)}
                      className="text-[11px] font-semibold underline text-amber-800 dark:text-amber-200 cursor-pointer"
                    >
                      Auto-fill code
                    </button>
                  </div>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
                    Your verification code is:{" "}
                    <code className="font-mono font-bold text-sm tracking-widest px-1.5 py-0.5 rounded bg-white/80 dark:bg-black/60 text-neutral-900 dark:text-white">
                      {previewCode}
                    </code>
                  </p>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="otp"
                    className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
                  >
                    6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400 pointer-events-none" />
                    <input
                      id="otp"
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
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/60 pl-10 pr-4 py-2.5 text-base font-mono tracking-[0.35em] outline-none transition-colors focus:border-neutral-900 dark:focus:border-white focus:bg-white dark:focus:bg-black focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-2.5 text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Verifying &amp; signing in...</span>
                    </>
                  ) : (
                    "Verify & Sign In"
                  )}
                </button>
              </form>

              <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
                <span>Didn&apos;t receive the code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResending}
                  className="inline-flex items-center gap-1 font-semibold text-neutral-900 dark:text-neutral-100 hover:underline disabled:opacity-50 cursor-pointer"
                >
                  <RotateCw className={`h-3 w-3 ${isResending ? "animate-spin" : ""}`} />
                  <span>{isResending ? "Resending..." : "Resend code"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-xs text-neutral-400 dark:text-neutral-500 text-center sm:text-left flex flex-wrap items-center justify-between gap-2 pt-4">
          <span>© {new Date().getFullYear()} SendPilot Inc.</span>
          <div className="flex gap-4">
            <span className="hover:text-neutral-600 dark:hover:text-neutral-300">Privacy</span>
            <span>•</span>
            <span className="hover:text-neutral-600 dark:hover:text-neutral-300">Security</span>
          </div>
        </div>
      </div>

      {/* ── Right Column: Interactive 3D Globe Showcase ─────────────── */}
      <div className="hidden lg:flex flex-1 h-full relative flex-col justify-between p-8 xl:p-12 overflow-hidden bg-[#070809] select-none">
        {/* Ambient radial glow background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-[110px] pointer-events-none" />

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />

        {/* Top Header Badge & Tagline */}
        <div className="relative z-10 space-y-2.5 max-w-md shrink-0">
          <h2 className="text-2xl xl:text-3xl font-semibold tracking-tight text-white leading-tight">
            Reach verified leads across <span className="text-emerald-400">160+ countries</span>.
          </h2>

          <p className="text-xs xl:text-sm text-neutral-400 leading-relaxed">
            Automate personalized outreach with human-in-the-loop approvals, native CRM sync, and safe delivery pacing.
          </p>
        </div>

        {/* Center: Interactive 3D Cobe Globe */}
        <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center py-2">
          <div className="relative w-full max-w-[340px] xl:max-w-[420px] aspect-square flex items-center justify-center">
            <Globe className="w-full h-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
