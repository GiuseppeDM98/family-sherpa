import { Badge } from "@/components/ui/badge";
import type { DEADLINE_CATEGORIES } from "@/db/enums";
import { CATEGORY_CHART_COLORS, CATEGORY_LABELS } from "@/lib/deadline-labels";

/**
 * A deadline's category chip, softly tinted with that category's fixed chart
 * hue (`CATEGORY_CHART_COLORS`) so the type is decodable at a glance — TARI,
 * Bollo and Medico each read as themselves without reading the label.
 *
 * The colour is applied as a low-alpha `color-mix` fill + a slightly stronger
 * border, both derived from the same `--chart-N` token, so it recolours
 * correctly in light and dark. The label text stays `text-foreground` (ink /
 * near-white) for full contrast — the hue names the category, it never has to
 * carry the text. This is the one sanctioned place category colour leaves the
 * charts; see DESIGN.md.
 */
export function CategoryBadge({ category }: { category: (typeof DEADLINE_CATEGORIES)[number] }) {
  const color = CATEGORY_CHART_COLORS[category];

  return (
    <Badge
      variant="outline"
      style={{
        backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`,
        borderColor: `color-mix(in oklch, ${color} 30%, transparent)`,
      }}
    >
      {CATEGORY_LABELS[category]}
    </Badge>
  );
}
