/**
 * SendPilot Design System Tokens
 * Warm off-white background, ink-black text, single green logo accent (#1F7A52), 8px spacing grid.
 */

export const tokens = {
  colors: {
    bg: {
      light: "#FAF9F6", // Warm off-white
      dark: "#141718",  // Calm charcoal
    },
    surface: {
      light: "#FFFFFF",
      dark: "#1B1E20",
    },
    surfaceInset: {
      light: "#F4F3EF",
      dark: "#222628",
    },
    ink: {
      primary: "#16191A",
      primaryDark: "#F2F2F0",
      secondary: "#626669",
      secondaryDark: "#9BA0A4",
      muted: "#8C9196",
      mutedDark: "#6E7377",
    },
    border: {
      light: "#E7E5E0",
      dark: "#2A2E31",
      subtle: "#EFECE6",
      subtleDark: "#222527",
    },
    accent: {
      green: "#1F7A52",      // Logo green accent
      greenHover: "#186342", // 1px darker on hover
      greenLight: "#E8F3ED", // Soft tint for tags/dots
      greenDark: "#103C28",
    },
    fit: {
      strong: {
        dot: "#1F7A52",
        text: "#1F7A52",
        bg: "#E8F3ED",
      },
      possible: {
        dot: "#C28514",
        text: "#8F600A",
        bg: "#FAF3E6",
      },
      review: {
        dot: "#7E8488",
        text: "#52575B",
        bg: "#F0F0EE",
      },
    },
  },
  typography: {
    fontSans: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    headline: {
      size: "text-4xl sm:text-5xl lg:text-[58px]",
      lineHeight: "leading-[1.12]",
      tracking: "tracking-[-0.025em]",
    },
    support: {
      size: "text-base sm:text-lg",
      lineHeight: "leading-[1.55]",
      tracking: "tracking-[-0.01em]",
    },
  },
  radii: {
    card: "12px",
    input: "8px",
    pill: "9999px",
  },
  spacing: {
    unit: 8, // 8px grid
  },
  shadows: {
    soft: "0 1px 3px 0 rgba(22, 25, 26, 0.04), 0 8px 24px -4px rgba(22, 25, 26, 0.04)",
  },
} as const;

export const PRODUCT_NAME = "SendPilot";
