"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/leads", label: "Leads", icon: "🧲" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/pipeline", label: "Pipeline", icon: "📋" },
  { href: "/approvals", label: "Approvals", icon: "✅" },
  { href: "/knowledge", label: "Knowledge", icon: "📚" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
          V
        </div>
        <span className="font-semibold text-slate-900">VideoDB CRM</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-indigo-50 text-brand"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="mb-2 truncate px-2 text-xs text-slate-500">{email}</div>
        <form action="/auth/signout" method="post">
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
