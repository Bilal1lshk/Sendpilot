"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import {
  UserPlus,
  Loader2,
  Mail,
  Lock,
  User,
  KeyRound,
  ShieldCheck,
  RotateCw,
  ArrowLeft,
} from "lucide-react";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"register" | "otp">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [senderEmail, setSenderEmail] = useState("contact@mbstack.net");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "Failed to create account");
      } else {
        setSenderEmail(data.senderEmail || "contact@mbstack.net");
        setOtp("");
        setStep("otp");
        toast.success(`Account created! Enter the 6-digit code sent to ${email.trim()}.`);
      }
    } catch {
      toast.error("An error occurred during registration");
    } finally {
      setIsLoading(false);
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
      const signInResult = await signIn("credentials", {
        email: email.trim(),
        password,
        otp: cleanOtp,
        redirect: false,
      });

      if (signInResult?.error) {
        toast.error("Invalid or expired verification code. Please try again.");
      } else {
        toast.success("Email verified! Let's set up your first campaign.");
        router.push("/get-started");
        router.refresh();
      }
    } catch {
      toast.error("Failed to verify code");
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
      toast.success("A new 6-digit verification code has been sent.");
    } catch {
      toast.error("Failed to resend verification code.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-950">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
        {step === "register" ? (
          <>
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                <UserPlus className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                Create an account
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Get started with SendPilot today
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="name"
                  className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 pl-10 pr-4 py-2.5 text-sm outline-none transition-colors focus:border-neutral-900 dark:focus:border-white focus:bg-white dark:focus:bg-black"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 pl-10 pr-4 py-2.5 text-sm outline-none transition-colors focus:border-neutral-900 dark:focus:border-white focus:bg-white dark:focus:bg-black"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
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
                    Creating account...
                  </>
                ) : (
                  "Sign Up"
                )}
              </button>
            </form>

            <SocialAuthButtons disabled={isLoading} />

            <p className="text-center text-xs text-neutral-500 dark:text-neutral-400 pt-2">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-neutral-900 dark:text-neutral-100 underline hover:opacity-80"
              >
                Sign in
              </Link>
            </p>
          </>
        ) : (
          /* ── OTP Verification Step ── */
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => setStep("register")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Verify Email with OTP</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                Check your email
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                We sent a 6-digit verification code from{" "}
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


            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="register-otp"
                  className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
                >
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400 pointer-events-none" />
                  <input
                    id="register-otp"
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Continue"
                )}
              </button>
            </form>

            <div className="flex items-center justify-between text-xs text-neutral-500">
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
    </div>
  );
}
