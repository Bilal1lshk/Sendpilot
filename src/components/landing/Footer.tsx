import Link from "next/link";
import { PRODUCT_NAME } from "@/lib/tokens";

export function Footer() {
  return (
    <footer className="border-t border-[#E7E5E0] dark:border-[#2A2E31] bg-[#FAF9F6] dark:bg-[#141718] py-12 text-[#626669] dark:text-[#9BA0A4] text-[13px]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2 text-[#16191A] dark:text-[#F2F2F0]">
          <div className="h-6 w-6 rounded bg-[#1F7A52] flex items-center justify-center text-white text-[11px] font-semibold">
            SP
          </div>
          <span className="font-semibold">{PRODUCT_NAME}</span>
          <span className="text-[#8C9196] dark:text-[#6E7377] ml-2">
            · Simple, respectful outreach
          </span>
        </div>

        <div className="flex items-center gap-6 text-[12px]">
          <Link href="/login" className="hover:text-[#16191A] dark:hover:text-[#F2F2F0] transition-colors">
            Sign in
          </Link>
          <Link href="/get-started" className="hover:text-[#16191A] dark:hover:text-[#F2F2F0] transition-colors">
            Get started
          </Link>
          <Link href="/dashboard" className="hover:text-[#16191A] dark:hover:text-[#F2F2F0] transition-colors">
            Dashboard
          </Link>
          <span className="text-[#8C9196] dark:text-[#6E7377]">
            © {new Date().getFullYear()} {PRODUCT_NAME}
          </span>
        </div>
      </div>
    </footer>
  );
}
