import { formatDateIt, formatEuroCents } from "@/lib/format";
import type { ParseResult, ParseResultItem } from "@/lib/ai/parse-schema";

/**
 * The Italian reply the user gets back after a message is parsed. Kept pure
 * and separate from the pipeline so the wording is testable without an LLM
 * or a Telegram chat.
 */

const TYPE_EMOJI: Record<ParseResultItem["type"], string> = {
  deadline: "📅",
  transaction: "💸",
  therapy: "💊",
  medication: "💊",
};

/** The parts of an item worth showing: label first, then whatever fields exist. */
function itemDetails(item: ParseResultItem): string[] {
  switch (item.type) {
    case "deadline":
      return [
        item.title,
        formatDateIt(item.due_date),
        item.amount_cents === null ? null : formatEuroCents(item.amount_cents),
      ].filter((part): part is string => part !== null);
    case "transaction":
      return [item.title, formatDateIt(item.date), formatEuroCents(item.amount_cents)];
    case "therapy":
      return [item.medication_name, item.dosage_text];
    case "medication":
      return [item.name, item.expiry_date ? formatDateIt(item.expiry_date) : null].filter(
        (part): part is string => part !== null,
      );
  }
}

export function formatItemLine(item: ParseResultItem): string {
  return `• ${TYPE_EMOJI[item.type]} ${itemDetails(item).join(" — ")}`;
}

/**
 * With no items there is nothing to confirm, so the reply is just the model's
 * conversational summary; otherwise it lists what will be saved, and flags the
 * model's own doubts when it wasn't confident.
 */
export function composeReply(parseResult: ParseResult): string {
  if (parseResult.items.length === 0) return parseResult.summary_it;

  const lines = [parseResult.summary_it, "", ...parseResult.items.map(formatItemLine)];

  if (parseResult.confidence !== "high" && parseResult.notes) {
    lines.push("", `⚠️ ${parseResult.notes}`);
  }

  return lines.join("\n");
}
