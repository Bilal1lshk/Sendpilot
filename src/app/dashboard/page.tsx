"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Send,
  UserCheck,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { microcopy } from "@/lib/microcopy";
import { pageVariants, cardVariants, listItemVariants } from "@/lib/motion";

export default function DashboardOverviewPage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name ? session.user.name.split(" ")[0] : "there";
  const greeting = microcopy.greetings.getTimeAwareGreeting(firstName);

  // [PLACEHOLDER DATA] Today's tasks state
  const [tasks, setTasks] = useState([
    {
      id: "t1",
      name: "Marcus Vance",
      title: "VP of Product",
      company: "Linear Dynamics",
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
      profileUrl: "https://linkedin.com",
      message: "Hey Marcus, loved your recent thoughts on developer tooling. Would love to connect and share notes.",
      done: true,
    },
    {
      id: "t2",
      name: "Devon Reed",
      title: "Head of Marketing",
      company: "Retool Apps",
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
      profileUrl: "https://linkedin.com",
      message: "Hi Devon, noticed Retool's new integrations update. We built an AI assistant that plugs right into internal outreach flows—curious if you've explored this?",
      done: true,
    },
    {
      id: "t3",
      name: "Sarah Lindqvist",
      title: "Growth Lead",
      company: "Nordic SaaS Labs",
      photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
      profileUrl: "https://linkedin.com",
      message: "Hi Sarah, saw your post on lead qualification. We automated profile scoring with zero scraping risk. Happy to send a 2-min demo if useful!",
      done: false,
    },
    {
      id: "t4",
      name: "Alexandre Moreau",
      title: "Co-Founder & CEO",
      company: "Synthetix AI",
      photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
      profileUrl: "https://linkedin.com",
      message: "Alexandre, congrats on the Seed round! Are you looking to ramp outbound pipeline while keeping account safety top of mind?",
      done: false,
    },
  ]);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const completedCount = tasks.filter((t) => t.done).length;
  const totalCount = 15; // daily cap
  const progressRatio = (completedCount + 6) / totalCount;
  const allTasksDone = completedCount === tasks.length;

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // SVG circular progress calculation
  const circleRadius = 24;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Top Greeting line: Time-aware human greeting */}
      <motion.div variants={cardVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {greeting}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Real-time pipeline performance and daily actions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/get-started"
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-palm-leaf-400 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-palm-leaf-600" />
            <span>Checklist</span>
          </Link>

          <Link
            href="/dashboard/campaigns"
            className="inline-flex items-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 active:scale-[0.99] text-white px-3.5 py-1.5 text-xs font-medium shadow-xs transition-all"
          >
            <Send className="h-3.5 w-3.5" />
            <span>New campaign</span>
          </Link>
        </div>
      </motion.div>

      {/* Four Calm Stat Cards with Large Counting Numbers and Subtle Sparkline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Leads */}
        <motion.div
          variants={cardVariants}
          className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Total leads
            </span>
            <div className="h-7 w-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <AnimatedCounter
              value={2480}
              className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 font-sans"
            />
          </div>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            85 new leads added this week
          </p>
          {/* Subtle sparkline */}
          <div className="mt-3 h-1 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "72%" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-full bg-palm-leaf-500 rounded-full"
            />
          </div>
        </motion.div>

        {/* Stat 2: Active Campaigns */}
        <motion.div
          variants={cardVariants}
          className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Active campaigns
            </span>
            <div className="h-7 w-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500">
              <Send className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <AnimatedCounter
              value={4}
              className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50"
            />
            <span className="text-xs text-neutral-400">of 6 total</span>
          </div>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            All 4 sequences delivering on schedule
          </p>
          <div className="mt-3 h-1 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "66%" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-full bg-palm-leaf-500 rounded-full"
            />
          </div>
        </motion.div>

        {/* Stat 3: Acceptance Rate */}
        <motion.div
          variants={cardVariants}
          className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Acceptance rate
            </span>
            <div className="h-7 w-7 rounded-lg bg-palm-leaf-50 dark:bg-palm-leaf-950/40 flex items-center justify-center text-palm-leaf-700 dark:text-palm-leaf-400">
              <UserCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <AnimatedCounter
              value={46}
              suffix="%"
              className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50"
            />
          </div>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            4% higher than last month
          </p>
          <div className="mt-3 h-1 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "46%" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-full bg-palm-leaf-500 rounded-full"
            />
          </div>
        </motion.div>

        {/* Stat 4: Replies This Week */}
        <motion.div
          variants={cardVariants}
          className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Replies this week
            </span>
            <div className="h-7 w-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <AnimatedCounter
              value={38}
              className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50"
            />
          </div>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            12 new replies, 3 more than last week
          </p>
          <div className="mt-3 h-1 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "82%" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-full bg-palm-leaf-500 rounded-full"
            />
          </div>
        </motion.div>
      </div>

      {/* Middle Section: "Today's Tasks" (Hero Card) & Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* "Today's Tasks" Hero Card: 2 cols */}
        <motion.div
          variants={cardVariants}
          className="lg:col-span-2 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs flex flex-col justify-between"
        >
          <div>
            {/* Header with Progress Ring */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Today&apos;s outreach tasks
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Review personal messages and send safely.
                </p>
              </div>

              {/* Soft Progress Ring */}
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 flex items-center justify-center">
                  <svg className="h-12 w-12 -rotate-90" viewBox="0 0 60 60">
                    <circle
                      cx="30"
                      cy="30"
                      r={circleRadius}
                      className="stroke-neutral-100 dark:stroke-neutral-800"
                      strokeWidth="5"
                      fill="transparent"
                    />
                    <motion.circle
                      cx="30"
                      cy="30"
                      r={circleRadius}
                      className="stroke-palm-leaf-500"
                      strokeWidth="5"
                      strokeDasharray={circumference}
                      animate={{ strokeDashoffset }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <span className="absolute text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                    {completedCount + 6}
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 block">
                    {completedCount + 6} of {totalCount} done
                  </span>
                  <span className="text-[11px] text-neutral-400 block">
                    Daily cap
                  </span>
                </div>
              </div>
            </div>

            {/* When all tasks are completed */}
            {allTasksDone && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className="my-6 p-6 rounded-2xl border border-palm-leaf-200 dark:border-palm-leaf-900/40 bg-palm-leaf-50/40 dark:bg-palm-leaf-950/20 text-center"
              >
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-palm-leaf-100 dark:bg-palm-leaf-900 text-palm-leaf-700 dark:text-palm-leaf-300">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {microcopy.emptyStates.tasksDone}
                </h4>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                  {microcopy.emptyStates.tasksDoneSubtitle}
                </p>
              </motion.div>
            )}

            {/* Task rows */}
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 mt-2">
              <AnimatePresence>
                {tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    variants={listItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className={`py-3.5 transition-opacity ${
                      task.done ? "opacity-50" : "opacity-100"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                            task.done
                              ? "border-palm-leaf-600 bg-palm-leaf-600 text-white"
                              : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-palm-leaf-500"
                          }`}
                          title={task.done ? "Mark pending" : "Mark done"}
                        >
                          {task.done && <Check className="h-3 w-3 stroke-[3]" />}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-semibold text-neutral-900 dark:text-neutral-100 ${
                                task.done ? "line-through text-neutral-400" : ""
                              }`}
                            >
                              {task.name}
                            </span>
                            <span className="text-[11px] text-neutral-400 truncate">
                              • {task.title} at {task.company}
                            </span>
                          </div>

                          <div className="mt-1.5 p-2 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-100 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-300">
                            <p className="line-clamp-2 leading-relaxed">
                              &ldquo;{task.message}&rdquo;
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center ml-7 sm:ml-0">
                        <a
                          href={task.profileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 px-2 py-1 text-[11px] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 transition-colors"
                        >
                          <LinkedInIcon className="h-3 w-3 text-[#0a66c2]" />
                          <span>Profile</span>
                          <ExternalLink className="h-2.5 w-2.5 text-neutral-400" />
                        </a>

                        <button
                          type="button"
                          onClick={() => copyMessage(task.id, task.message)}
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 px-2 py-1 text-[11px] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 transition-colors"
                        >
                          {copiedId === task.id ? (
                            <>
                              <Check className="h-3 w-3 text-palm-leaf-600" />
                              <span className="text-palm-leaf-700 font-medium">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 text-neutral-400" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            task.done
                              ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                              : "bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white"
                          }`}
                        >
                          {task.done ? "Undo" : "Done"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
            <span>Next queue batch ready at 2:00 PM</span>
            <Link
              href="/dashboard/leads"
              className="text-palm-leaf-700 dark:text-palm-leaf-400 hover:underline flex items-center gap-1 font-medium"
            >
              <span>View all leads</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </motion.div>

        {/* Funnel Card: 1 Col, Animates Left to Right, One Stage at a Time */}
        <motion.div
          variants={cardVariants}
          className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Outreach funnel
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Last 30 days conversion
                </p>
              </div>
            </div>

            {/* Funnel stages animating smoothly */}
            <div className="mt-5 space-y-4">
              {/* Stage 1 */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                    Requests sent
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    1,240 <span className="text-[10px] text-neutral-400 font-normal">100%</span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-palm-leaf-300"
                  />
                </div>
              </div>

              {/* Stage 2 */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                    Accepted
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    570 <span className="text-[10px] text-palm-leaf-700 dark:text-palm-leaf-400 font-medium">46%</span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "46%" }}
                    transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-palm-leaf-500"
                  />
                </div>
              </div>

              {/* Stage 3 */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                    Replied
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    182 <span className="text-[10px] text-palm-leaf-700 dark:text-palm-leaf-400 font-medium">32%</span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "32%" }}
                    transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-palm-leaf-600"
                  />
                </div>
              </div>

              {/* Stage 4 */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                    Meetings booked
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    24 <span className="text-[10px] text-palm-leaf-700 dark:text-palm-leaf-400 font-medium">13%</span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "13%" }}
                    transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-palm-leaf-700"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Personalized icebreakers mentioning recent posts convert twice as high as generic greetings.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Account Health: Pulsing Green Dot for Active, Steady Amber & Red */}
      <motion.div
        variants={cardVariants}
        className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs"
      >
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Account health
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Connected LinkedIn sender profiles and safety status.
            </p>
          </div>
          <Link
            href="/dashboard/accounts"
            className="text-xs text-palm-leaf-700 dark:text-palm-leaf-400 hover:underline flex items-center gap-1 font-medium"
          >
            <span>Manage accounts</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {/* Account 1: Active with pulsing dot */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-neutral-200/60 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                <LinkedInIcon className="h-4 w-4 text-[#0a66c2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    Alex Rivera
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  18 of 25 requests used today • Stage 3
                </p>
              </div>
            </div>

            <div className="text-xs sm:text-right">
              <span className="text-[10px] text-neutral-400 block uppercase font-medium">Safety</span>
              <span className="font-semibold text-palm-leaf-700 dark:text-palm-leaf-400">98% healthy</span>
            </div>
          </div>

          {/* Account 2: Active with pulsing dot */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-neutral-200/60 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                <LinkedInIcon className="h-4 w-4 text-[#0a66c2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    Elena Rostova
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  12 of 15 requests used today • Stage 2
                </p>
              </div>
            </div>

            <div className="text-xs sm:text-right">
              <span className="text-[10px] text-neutral-400 block uppercase font-medium">Safety</span>
              <span className="font-semibold text-palm-leaf-700 dark:text-palm-leaf-400">100% healthy</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
