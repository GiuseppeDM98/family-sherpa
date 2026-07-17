import Link from "next/link";
import { Pill, Settings } from "lucide-react";
import { EmptyStatePage } from "@/components/empty-state-page";

const links = [
  { href: "/meds", label: "Armadietto dei farmaci", icon: Pill },
  { href: "/settings", label: "Impostazioni", icon: Settings },
];

export default function MorePage() {
  return (
    <EmptyStatePage title="Altro">
      <ul className="divide-border -mx-6 divide-y">
        {links.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="hover:bg-accent flex items-center gap-3 px-6 py-3"
            >
              <Icon className="text-muted-foreground size-4" />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </EmptyStatePage>
  );
}
