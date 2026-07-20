import { z } from "zod";
import {
  ASSET_TYPES,
  HOME_OWNERSHIPS,
  PERSON_RELATIONSHIPS,
  VEHICLE_FUELS,
} from "@/db/enums";

// Re-exported so existing importers of "@/lib/asset-metadata" keep working —
// the arrays themselves live in @/db/enums because they also back
// client-side <select> options, and this file is server-only (it imports
// zod's full runtime for the schemas below).
export { HOME_OWNERSHIPS, PERSON_RELATIONSHIPS, VEHICLE_FUELS };

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const VehicleMetadataSchema = z.object({
  plate: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().optional(),
  fuel: z.enum(VEHICLE_FUELS).optional(),
  matriculation_date: z.string().regex(YMD_REGEX).optional(),
});
export type VehicleMetadata = z.infer<typeof VehicleMetadataSchema>;

export const PersonMetadataSchema = z.object({
  birth_date: z.string().regex(YMD_REGEX).optional(),
  relationship: z.enum(PERSON_RELATIONSHIPS).optional(),
});
export type PersonMetadata = z.infer<typeof PersonMetadataSchema>;

export const HomeMetadataSchema = z.object({
  address: z.string().optional(),
  ownership: z.enum(HOME_OWNERSHIPS).optional(),
});
export type HomeMetadata = z.infer<typeof HomeMetadataSchema>;

export const OtherMetadataSchema = z.object({}).catchall(z.unknown());
export type OtherMetadata = z.infer<typeof OtherMetadataSchema>;

/** Metadata Zod schema per asset `type`. */
export const ASSET_METADATA_SCHEMAS = {
  vehicle: VehicleMetadataSchema,
  person: PersonMetadataSchema,
  home: HomeMetadataSchema,
  other: OtherMetadataSchema,
} satisfies Record<(typeof ASSET_TYPES)[number], z.ZodTypeAny>;

export type AssetMetadata =
  | VehicleMetadata
  | PersonMetadata
  | HomeMetadata
  | OtherMetadata;

/** Validates raw JSON against the metadata shape for the given asset type. */
export function parseAssetMetadata(
  type: (typeof ASSET_TYPES)[number],
  raw: unknown,
): AssetMetadata {
  return ASSET_METADATA_SCHEMAS[type].parse(raw);
}
