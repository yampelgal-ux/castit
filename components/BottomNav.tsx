"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, MessageCircle, User, Users, PlayCircle, FolderOpen, Inbox } from "lucide-react";
import { useStore } from "@/lib/store";
import { useUnreadCount } from "@/lib/notifications-store";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const talentItems = [
  { href: "/feed", icon: Home, label: "Feed" },
  { href: "/discover", icon: Search, label: "Discover" },
  { href: "/inbox", icon: Inbox, label: "Auditions", badgeFor: "talent" as const },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/profile/me", icon: User, label: "Profile" },
];

const proItems = [
  { href: "/pro/dashboard", icon: Home, label: "Studio", badgeFor: "pro" as const },
  { href: "/pro/projects", icon: FolderOpen, label: "Projects" },
  { href: "/pro/search", icon: Users, label: "Search" },
  { href: "/pro/reels", icon: PlayCircle, label: "Reels" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/profile/me", icon: User, label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();
  const role = useStore((s) => s.profile.role);
  const items = role === "Casting Pro" ? proItems : talentItems;
  const unreadTalent = useUnreadCount("talent");
  const unreadPro = useUnreadCount("pro");
  const unread = role === "Casting Pro" ? unreadPro : unreadTalent;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 max-w-[440px] mx-auto">
      <div className="glass border-t border-border px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex justify-around items-center">
          {items.map((item) => {
            const { href, icon: Icon, label } = item;
            const showBadge = "badgeFor" in item && !!item.badgeFor;
            const active = pathname?.startsWith(href.split("/").slice(0, 2).join("/"));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => haptic("light")}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all relative",
                  active ? "text-gold" : "text-text-muted hover:text-text"
                )}
              >
                <div className="relative">
                  <Icon
                    className={cn("w-5 h-5 transition-transform", active && "scale-110")}
                    strokeWidth={active ? 2.4 : 2}
                  />
                  {showBadge && unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 rounded-full bg-danger text-white text-[8px] font-bold grid place-items-center px-0.5">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </div>
                <span className={cn("text-[9px] font-medium tracking-wide", active && "text-gold")}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
