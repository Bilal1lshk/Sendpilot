import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { decodeOpaqueSession, encodeOpaqueSession, revokeOpaqueSession } from "@/lib/opaque-auth-session";

const isProduction =
  process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

if (isProduction) {
  // Guard against localhost NEXTAUTH_URL leaking into production on Vercel
  const currentUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (!currentUrl || currentUrl.includes("localhost") || currentUrl.includes("127.0.0.1")) {
    const prodUrl =
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      "https://sendpilot-gamma.vercel.app";

    process.env.AUTH_URL = prodUrl;
    process.env.NEXTAUTH_URL = prodUrl;
    process.env.AUTH_TRUST_HOST = "true";
  }
} else {
  // In local development, prevent production Vercel URL from leaking in and breaking cookies/CSRF
  const currentUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "";
  if (!currentUrl || currentUrl.includes("vercel.app") || currentUrl.startsWith("https://")) {
    const port = process.env.PORT || "3000";
    const localUrl = `http://localhost:${port}`;
    process.env.AUTH_URL = localUrl;
    process.env.NEXTAUTH_URL = localUrl;
    process.env.AUTH_TRUST_HOST = "true";
  }
}

const currentAuthUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "";
const useSecureCookies = isProduction && currentAuthUrl.startsWith("https://");
const cookiePrefix = useSecureCookies ? "__Host-" : "";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  basePath: "/api/auth",
  trustHost: true,
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}sendpilot.session`,
      options: {
        httpOnly: true,
        secure: useSecureCookies,
        sameSite: "lax",
        path: "/",
      },
    },
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password || !credentials?.otp) {
          return null;
        }

        const email = (credentials.email as string).trim().toLowerCase();
        const otp = (credentials.otp as string).trim();

        await connectDB();
        const user = await User.findOne({ email }).select("+password");

        if (!user || !user.password) {
          return null;
        }

        const isMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isMatch) {
          return null;
        }

        const { verifyOtpCode } = await import("@/lib/mailer");
        const otpResult = await verifyOtpCode(email, "login_otp", otp, true);
        if (!otpResult.valid) {
          return null;
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          // If email is not granted or missing, fallback redirect to default login
          if (!user.email) {
            console.error("Google OAuth signIn failed: user.email is missing");
            return "/login?error=OAuthCallbackError";
          }

          await connectDB();
          const email = user.email.toLowerCase();
          const existingUser = await User.findOne({ email });

          if (!existingUser) {
            const name = user.name || email.split("@")[0] || "User";

            await User.create({
              name,
              email,
              image: user.image || undefined,
            });
          } else {
            let updated = false;
            if (!existingUser.image && user.image) {
              existingUser.image = user.image;
              updated = true;
            }
            if (!existingUser.name && user.name) {
              existingUser.name = user.name;
              updated = true;
            }
            if (updated) {
              await existingUser.save();
            }
          }
        } catch {
          console.error("Error creating or updating Google OAuth user");
          return "/login?error=DatabaseError";
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "google") {
          try {
            await connectDB();
            const dbUser = await User.findOne({ email: token.email?.toLowerCase() });
            if (dbUser) {
              token.id = dbUser._id.toString();
              token.picture = dbUser.image || token.picture;
            } else {
              token.id = user.id;
            }
          } catch {
            token.id = user.id;
          }
        } else {
          token.id = user.id;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        if (token.picture && !session.user.image) {
          session.user.image = token.picture as string;
        }
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  jwt: { encode: encodeOpaqueSession, decode: decodeOpaqueSession },
  events: {
    async signOut(message) {
      if ("token" in message) await revokeOpaqueSession(message.token);
    },
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});
