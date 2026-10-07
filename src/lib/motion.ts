import type { Variants, Transition } from "motion/react";

/**
 * SendPilot Shared Motion System
 * 
 * Rules:
 * - Durations: 150ms for hovers, 200-300ms for entrances and panels.
 * - Easing: "easeOut" for entering, "easeIn" for leaving.
 * - Page entrance: content fades in and rises 8px. Cards/rows stagger by 40ms (max 8 items).
 * - Transforms & opacity only for 60fps performance on mobile.
 * - Respects prefers-reduced-motion.
 */

export const transitions: Record<string, Transition> = {
  hover: { duration: 0.15, ease: "easeOut" },
  enter: { duration: 0.25, ease: "easeOut" },
  leave: { duration: 0.2, ease: "easeIn" },
  counter: { duration: 0.6, ease: "easeOut" },
  progressBar: { duration: 0.5, ease: "easeOut" },
};

export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: "easeOut",
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
};

export const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

export const drawerVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.18, ease: "easeIn" },
  },
};

export const floatingBarVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: 16,
    transition: { duration: 0.18, ease: "easeIn" },
  },
};
