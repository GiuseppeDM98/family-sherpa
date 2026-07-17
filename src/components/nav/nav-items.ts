import { Home, CalendarClock, Inbox, Boxes, MoreHorizontal, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/deadlines", label: "Scadenze", icon: CalendarClock },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/assets", label: "Asset", icon: Boxes },
  { href: "/more", label: "Altro", icon: MoreHorizontal },
];
