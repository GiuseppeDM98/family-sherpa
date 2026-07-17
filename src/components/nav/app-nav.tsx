"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigazione principale"
      className={cn(
        "border-border bg-background fixed inset-x-0 bottom-0 z-40 border-t",
        "md:top-14 md:bottom-0 md:left-0 md:w-56 md:border-t-0 md:border-r",
      )}
    >
      <ul className="flex justify-around md:flex-col md:justify-start md:gap-1 md:p-3">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="md:w-full">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 text-xs",
                  "md:flex-row md:gap-3 md:rounded-md md:px-3 md:py-2 md:text-sm",
                  active
                    ? "text-primary md:bg-accent md:text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5 md:size-4" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
