"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarCheck, BookA, Library, Headphones, BookOpen,
  PenLine, Mic, Languages, Bot, LineChart, Radar, StickyNote, Video, Settings, Leaf,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/planner", label: "Kế hoạch hằng ngày", icon: CalendarCheck },
  { href: "/vocabulary", label: "Từ vựng", icon: BookA },
  { href: "/cambridge", label: "Cambridge IELTS", icon: Library },
  { href: "/listening", label: "Listening", icon: Headphones },
  { href: "/reading", label: "Reading", icon: BookOpen },
  { href: "/writing", label: "Writing", icon: PenLine },
  { href: "/speaking", label: "Speaking", icon: Mic },
  { href: "/grammar", label: "Ngữ pháp", icon: Languages },
  { href: "/grader", label: "Chấm bài bằng AI", icon: Bot },
  { href: "/scores", label: "Theo dõi điểm", icon: LineChart },
  { href: "/weaknesses", label: "Phân tích điểm yếu", icon: Radar },
  { href: "/notes", label: "Ghi chú", icon: StickyNote },
  { href: "/resources", label: "Tài liệu & Video", icon: Video },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/login");

  if (isAuthPage) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r border-black/5 bg-card p-4 lg:flex">
        <Link href="/" className="mb-4 flex items-center gap-2 px-2 py-3 text-accent-strong">
          <Leaf className="h-6 w-6" aria-hidden />
          <span className="text-lg font-semibold">IELTS 6.5 Journey</span>
        </Link>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-soft ${
                active ? "bg-soft font-medium text-accent-strong" : "text-foreground/80"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}
