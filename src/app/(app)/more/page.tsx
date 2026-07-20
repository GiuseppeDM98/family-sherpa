import Link from "next/link";
import { ChevronRight, Pill, Settings } from "lucide-react";
import { Card } from "@/components/ui/card";

const links = [
  { href: "/meds", label: "Armadietto dei farmaci", icon: Pill },
  { href: "/settings", label: "Impostazioni", icon: Settings },
];

export default function MorePage() {
  return (
    <div className="space-y-4 py-4">
      <h1 className="text-2xl font-semibold">Altro</h1>
      <Card className="py-0">
        <ul className="divide-border divide-y">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="hover:bg-accent flex items-center gap-3 px-4 py-3 transition-colors"
              >
                <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
                <span className="flex-1 text-sm">{label}</span>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
