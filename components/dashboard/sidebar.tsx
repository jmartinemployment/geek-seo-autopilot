"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Globe,
  Key,
  FileText,
  Calendar,
  BarChart3,
  Settings,
  ChevronDown,
  Zap,
  Mic,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Site {
  id: string;
  name: string;
  domain: string;
}

interface SidebarProps {
  sites?: Site[];
  activeSiteId?: string;
}

const navItems = (siteId: string) => [
  {
    label: "Dashboard",
    href: `/dashboard`,
    icon: LayoutDashboard,
  },
  {
    label: "Sites",
    href: `/sites`,
    icon: Globe,
  },
  {
    label: "Keywords",
    href: `/sites/${siteId}/keywords`,
    icon: Key,
    requiresSite: true,
  },
  {
    label: "Articles",
    href: `/sites/${siteId}/articles`,
    icon: FileText,
    requiresSite: true,
  },
  {
    label: "Calendar",
    href: `/sites/${siteId}/calendar`,
    icon: Calendar,
    requiresSite: true,
  },
  {
    label: "Analytics",
    href: `/sites/${siteId}/analytics`,
    icon: BarChart3,
    requiresSite: true,
  },
  {
    label: "Settings",
    href: `/sites/${siteId}/settings`,
    icon: Settings,
    requiresSite: true,
  },
];

const GLOBAL_NAV = [
  { label: "Brand Hub", href: "/brand", icon: Mic },
];

export function Sidebar({ sites = [], activeSiteId }: SidebarProps) {
  const pathname = usePathname();

  // Detect active site from URL: /sites/[siteId]/...
  const siteIdFromUrl = pathname.match(/\/sites\/([^/]+)/)?.[1];
  const activeSite =
    sites.find((s) => s.id === siteIdFromUrl) ??
    sites.find((s) => s.id === activeSiteId) ??
    sites[0];
  const items = navItems(activeSite?.id ?? "");

  return (
    <aside className="w-60 shrink-0 bg-slate-900 text-slate-100 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-700">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-sm tracking-tight">
          Geek SEO Autopilot
        </span>
      </div>

      {/* Site selector */}
      {sites.length > 0 && (
        <div className="px-3 py-3 border-b border-slate-700">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors text-sm">
              <div className="truncate text-left">
                <div className="font-medium truncate">
                  {activeSite?.name ?? "Select site"}
                </div>
                {activeSite && (
                  <div className="text-xs text-slate-400 truncate">
                    {activeSite.domain}
                  </div>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              {sites.map((site) => (
                <DropdownMenuItem key={site.id}>
                  <Link href={`/sites/${site.id}`} className="w-full">
                    <div className="font-medium">{site.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {site.domain}
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem>
                <Link href="/sites/new" className="text-blue-500 w-full">
                  + Add new site
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          if (item.requiresSite && !activeSite) return null;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {/* Global nav items */}
        <div className="pt-3 mt-3 border-t border-slate-700">
          {GLOBAL_NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-700">
        <Link
          href="/account"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Settings className="w-4 h-4" />
          Account
        </Link>
      </div>
    </aside>
  );
}
