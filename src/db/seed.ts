/**
 * Development seed: idempotently (re)creates a demo family ("Famiglia Demo")
 * with a representative set of assets, deadlines, transactions, medications
 * and an active therapy, so the app has realistic data to develop against.
 *
 * Run with: pnpm db:seed
 */
import { eq, inArray } from "drizzle-orm";
import { encryptField } from "@/lib/crypto";
import { db } from "./index";
import {
  assets,
  deadlines,
  familyMembers,
  families,
  medications,
  therapies,
  therapyIntakes,
  transactions,
  users,
} from "./schema";

const DEMO_FAMILY_NAME = "Famiglia Demo";
const DEMO_USER_EMAIL = "demo@familysherpa.dev";

function addDays(ymd: string, days: number): string {
  const date = new Date(`${ymd}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Europe/Rome -> UTC using a fixed CEST (+02:00) offset. Good enough for a
 * dev seed script anchored to "today"; spec 07 introduces the DST-safe
 * helper (src/lib/reminders/time.ts) the running app actually relies on.
 */
function romeTimeToUtcIso(dateYmd: string, hhmm: string): string {
  return new Date(`${dateYmd}T${hhmm}:00+02:00`).toISOString();
}

async function wipeExistingDemoData() {
  const [family] = await db
    .select()
    .from(families)
    .where(eq(families.name, DEMO_FAMILY_NAME));

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, DEMO_USER_EMAIL));

  if (family) {
    const familyTherapies = await db
      .select({ id: therapies.id })
      .from(therapies)
      .where(eq(therapies.family_id, family.id));
    const therapyIds = familyTherapies.map((t) => t.id);

    if (therapyIds.length > 0) {
      await db
        .delete(therapyIntakes)
        .where(inArray(therapyIntakes.therapy_id, therapyIds));
    }
    await db.delete(therapies).where(eq(therapies.family_id, family.id));
    await db.delete(transactions).where(eq(transactions.family_id, family.id));
    await db.delete(deadlines).where(eq(deadlines.family_id, family.id));
    await db.delete(medications).where(eq(medications.family_id, family.id));
    await db.delete(assets).where(eq(assets.family_id, family.id));
    await db.delete(familyMembers).where(eq(familyMembers.family_id, family.id));
    await db.delete(families).where(eq(families.id, family.id));
  }

  if (user) {
    await db.delete(users).where(eq(users.id, user.id));
  }
}

async function seed() {
  await wipeExistingDemoData();

  const today = new Date().toISOString().slice(0, 10);

  const [user] = await db
    .insert(users)
    .values({ name: "Demo Famiglia", email: DEMO_USER_EMAIL })
    .returning();
  if (!user) throw new Error("Failed to insert demo user");

  const [family] = await db
    .insert(families)
    .values({ name: DEMO_FAMILY_NAME })
    .returning();
  if (!family) throw new Error("Failed to insert demo family");

  await db.insert(familyMembers).values({
    family_id: family.id,
    user_id: user.id,
    role: "admin",
  });

  const [vehicle, person, home] = await db
    .insert(assets)
    .values([
      {
        family_id: family.id,
        type: "vehicle",
        name: "Panda di Giulia",
        metadata: {
          plate: "AB123CD",
          make: "Fiat",
          model: "Panda",
          year: 2018,
          fuel: "benzina",
          matriculation_date: "2018-05-10",
        },
      },
      {
        family_id: family.id,
        type: "person",
        name: "Sofia",
        metadata: { birth_date: "2016-03-12", relationship: "bambino" },
        // Synthetic CF for seed data only — not guaranteed to pass the real
        // check-character algorithm (implemented in spec 06).
        codice_fiscale_enc: encryptField("RSSSFO16C52F205X"),
      },
      {
        family_id: family.id,
        type: "home",
        name: "Casa",
        metadata: { address: "Via Roma 1, Milano", ownership: "proprietà" },
      },
    ])
    .returning();
  if (!vehicle || !person || !home) throw new Error("Failed to insert demo assets");

  const insertedDeadlines = await db
    .insert(deadlines)
    .values([
      {
        family_id: family.id,
        asset_id: vehicle.id,
        category: "bollo",
        title: "Bollo Panda",
        due_date: addDays(today, 29),
        amount_cents: 8750,
        recurrence: "annual",
        source: "manual",
      },
      {
        family_id: family.id,
        asset_id: vehicle.id,
        category: "rca",
        title: "Assicurazione RCA Panda",
        due_date: addDays(today, 46),
        amount_cents: 42000,
        recurrence: "annual",
        source: "manual",
      },
      {
        family_id: family.id,
        asset_id: vehicle.id,
        category: "revisione",
        title: "Revisione Panda",
        due_date: addDays(today, 126),
        amount_cents: 6600,
        recurrence: "biennial",
        source: "manual",
      },
      {
        family_id: family.id,
        asset_id: home.id,
        category: "tari",
        title: "TARI — 1ª rata",
        due_date: addDays(today, 14),
        amount_cents: 15000,
        recurrence: "none",
        source: "manual",
      },
      {
        family_id: family.id,
        asset_id: home.id,
        category: "tari",
        title: "TARI — 2ª rata",
        due_date: addDays(today, 106),
        amount_cents: 15000,
        recurrence: "none",
        source: "manual",
      },
      {
        family_id: family.id,
        asset_id: home.id,
        category: "bolletta",
        title: "Bolletta luce",
        due_date: addDays(today, 19),
        amount_cents: 12500,
        recurrence: "bimonthly",
        source: "manual",
      },
      {
        family_id: family.id,
        asset_id: person.id,
        category: "documento",
        title: "Rinnovo carta d'identità Sofia",
        due_date: addDays(today, 200),
        amount_cents: 2200,
        recurrence: "none",
        source: "manual",
      },
      {
        family_id: family.id,
        asset_id: person.id,
        category: "medico",
        title: "Visita pediatrica Sofia",
        due_date: addDays(today, 34),
        amount_cents: 3000,
        recurrence: "none",
        source: "manual",
        notes_enc: encryptField("Portare tessera sanitaria e impegnativa"),
      },
    ])
    .returning();

  const insertedTransactions = await db
    .insert(transactions)
    .values([
      {
        family_id: family.id,
        asset_id: vehicle.id,
        category: "tagliando",
        title: "Tagliando Panda",
        date: addDays(today, -180),
        amount_cents: 25000,
        source: "manual",
      },
      {
        family_id: family.id,
        asset_id: vehicle.id,
        category: "bollo",
        title: "Bollo Panda",
        date: addDays(today, -330),
        amount_cents: 8500,
        source: "manual",
      },
      {
        family_id: family.id,
        asset_id: vehicle.id,
        category: "rca",
        title: "Assicurazione RCA Panda",
        date: addDays(today, -300),
        amount_cents: 41000,
        source: "manual",
      },
      {
        family_id: family.id,
        asset_id: vehicle.id,
        category: "altro",
        title: "Carburante",
        date: addDays(today, -90),
        amount_cents: 6000,
        source: "manual",
      },
      {
        family_id: family.id,
        asset_id: home.id,
        category: "bolletta",
        title: "Bolletta luce",
        date: addDays(today, -45),
        amount_cents: 11000,
        source: "manual",
      },
      {
        family_id: family.id,
        asset_id: home.id,
        category: "bolletta",
        title: "Bolletta gas",
        date: addDays(today, -75),
        amount_cents: 9500,
        source: "manual",
      },
      {
        family_id: family.id,
        asset_id: home.id,
        category: "condominio",
        title: "Spese condominiali",
        date: addDays(today, -60),
        amount_cents: 20000,
        source: "manual",
      },
      {
        family_id: family.id,
        asset_id: home.id,
        category: "tari",
        title: "TARI",
        date: addDays(today, -260),
        amount_cents: 14500,
        source: "manual",
      },
      {
        family_id: family.id,
        asset_id: home.id,
        category: "bolletta",
        title: "Bolletta internet",
        date: addDays(today, -30),
        amount_cents: 3000,
        source: "manual",
      },
      {
        family_id: family.id,
        asset_id: vehicle.id,
        category: "tagliando",
        title: "Tagliando Panda",
        date: addDays(today, -390),
        amount_cents: 18000,
        source: "manual",
      },
    ])
    .returning();

  const insertedMedications = await db
    .insert(medications)
    .values([
      {
        family_id: family.id,
        name: "Tachipirina 500mg",
        format: "20 compresse",
        expiry_date: addDays(today, 330),
        quantity: "1 scatola",
      },
      {
        family_id: family.id,
        name: "Amoxicillina 250mg/5ml sciroppo",
        format: "1 flacone 100ml",
        expiry_date: addDays(today, 30),
        quantity: "1 flacone",
      },
    ])
    .returning();

  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);

  const [therapy] = await db
    .insert(therapies)
    .values({
      family_id: family.id,
      person_asset_id: person.id,
      medication_name: "Amoxicillina",
      dosage_text: "1 misurino ogni 12 ore",
      times_per_day: 2,
      times: ["08:00", "20:00"],
      start_date: yesterday,
      end_date: addDays(yesterday, 6),
      active: true,
    })
    .returning();
  if (!therapy) throw new Error("Failed to insert demo therapy");

  const yesterdayMorning = romeTimeToUtcIso(yesterday, "08:00");
  const yesterdayEvening = romeTimeToUtcIso(yesterday, "20:00");
  const todayMorning = romeTimeToUtcIso(today, "08:00");
  const todayEvening = romeTimeToUtcIso(today, "20:00");
  const tomorrowMorning = romeTimeToUtcIso(tomorrow, "08:00");
  const tomorrowEvening = romeTimeToUtcIso(tomorrow, "20:00");

  const insertedIntakes = await db
    .insert(therapyIntakes)
    .values([
      {
        therapy_id: therapy.id,
        scheduled_at: yesterdayMorning,
        status: "taken",
        taken_at: yesterdayMorning,
      },
      {
        therapy_id: therapy.id,
        scheduled_at: yesterdayEvening,
        status: "taken",
        taken_at: yesterdayEvening,
      },
      {
        therapy_id: therapy.id,
        scheduled_at: todayMorning,
        status: "taken",
        taken_at: todayMorning,
      },
      { therapy_id: therapy.id, scheduled_at: todayEvening, status: "pending" },
      { therapy_id: therapy.id, scheduled_at: tomorrowMorning, status: "pending" },
      { therapy_id: therapy.id, scheduled_at: tomorrowEvening, status: "pending" },
    ])
    .returning();

  console.table([
    { table: "users", rows: 1 },
    { table: "families", rows: 1 },
    { table: "family_members", rows: 1 },
    { table: "assets", rows: 3 },
    { table: "deadlines", rows: insertedDeadlines.length },
    { table: "transactions", rows: insertedTransactions.length },
    { table: "medications", rows: insertedMedications.length },
    { table: "therapies", rows: 1 },
    { table: "therapy_intakes", rows: insertedIntakes.length },
  ]);
  console.log(`\nDemo family invite code: ${family.invite_code}`);
}

seed()
  .then(() => {
    console.log("Seed completed.");
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
