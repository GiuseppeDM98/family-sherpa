import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

/**
 * Public landing page served at "/" for logged-out visitors (see src/proxy.ts).
 * Brand-register surface: it extends the app's "calm ledger" identity — the
 * icon's own language of navy sky, cream twin peaks and a rising orange sun —
 * at marketing scale. Self-contained explicit brand colours (not the app theme
 * tokens) so it renders identically regardless of the visitor's colour scheme;
 * entrance motion lives in globals.css and is reduced-motion-safe.
 */

const REPO_URL = "https://github.com/GiuseppeDM98/family-sherpa";

export const metadata: Metadata = {
  title: "FamilySherpa — Il carico mentale della famiglia, gestito per te",
  description:
    "Inoltra un vocale, una foto o un PDF: l'AI capisce cosa è, quando scade e quanto costa. Tu tocchi Conferma e te ne dimentichi. Open source e self-hosted.",
  openGraph: {
    title: "FamilySherpa",
    description: "Il carico mentale della tua famiglia, gestito per te.",
    images: ["/landing/dashboard.png"],
  },
};

/** The peaks-and-sun brand mark as inline SVG (cream peaks, orange sun). */
function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
      <circle cx="34" cy="15" r="7" fill="#eb6834" />
      <path d="M2 42 L18 12 L28 30 L31 25 L46 42 Z" fill="#f2ede3" />
    </svg>
  );
}

function GithubGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.3-1.8-1.3-1.8-1.1-.7 0-.7 0-.7 1.2.1 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 5 18.3 5.3 18.3 5.3c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

export default function WelcomePage() {
  return (
    <div className="min-h-dvh bg-[#faf7f1] text-[#17130d]">
      {/* ---------------------------------------------------------------- Hero */}
      <header className="relative overflow-hidden bg-[#0f172a] text-[#f2ede3]">
        {/* Rising sun behind the content */}
        <div
          className="lp-sun pointer-events-none absolute -top-24 right-[-6rem] size-[26rem] rounded-full opacity-60 blur-[2px] md:right-[8%]"
          style={{ background: "radial-gradient(circle at center, #eb6834 0%, #eb683455 45%, transparent 70%)" }}
          aria-hidden
        />

        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <span className="flex items-center gap-2 font-semibold">
            <BrandMark className="size-7" />
            FamilySherpa
          </span>
          <nav className="flex items-center gap-2 sm:gap-3">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-2 rounded-full px-3 py-1.5 text-sm text-[#c7cdd9] transition-colors hover:text-white sm:inline-flex"
            >
              <GithubGlyph className="size-4" />
              GitHub
            </a>
            <Link
              href="/signin"
              className="rounded-full bg-[#f2ede3] px-4 py-1.5 text-sm font-medium text-[#0f172a] transition-colors hover:bg-white"
            >
              Accedi
            </Link>
          </nav>
        </div>

        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pt-10 pb-40 md:grid-cols-[1.05fr_0.95fr] md:items-center md:pb-48 md:pt-16">
          <div>
            <p className="lp-reveal mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-[#c7cdd9]">
              <span className="size-1.5 rounded-full bg-[#eb6834]" />
              Open source · self-hosted
            </p>
            <h1
              className="lp-reveal text-[clamp(2.4rem,6vw,4.25rem)] leading-[1.04] font-bold tracking-[-0.03em] text-balance"
              style={{ animationDelay: "80ms" }}
            >
              La tua famiglia ha mille scadenze.
              <br />
              <span className="text-[#f0a26a]">Tu non devi ricordarne nessuna.</span>
            </h1>
            <p
              className="lp-reveal mt-6 max-w-xl text-lg leading-relaxed text-[#c7cdd9] text-pretty"
              style={{ animationDelay: "160ms" }}
            >
              Inoltra un vocale, una foto o un PDF. L&apos;AI capisce cosa è, quando scade e quanto
              costa, tu tocchi <span className="font-medium text-[#f2ede3]">Conferma</span> e te ne
              dimentichi. A ricordartelo, per tempo, ci pensa FamilySherpa.
            </p>
            <div className="lp-reveal mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "240ms" }}>
              <Link
                href="/signin"
                className="rounded-full bg-[#eb6834] px-6 py-3 font-medium text-white transition-colors hover:bg-[#d95926]"
              >
                Entra nella tua istanza
              </Link>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 font-medium text-[#f2ede3] transition-colors hover:bg-white/10"
              >
                <GithubGlyph className="size-4" />
                Guarda il codice
              </a>
            </div>
            <p className="lp-reveal mt-5 text-sm text-[#8b93a3]" style={{ animationDelay: "300ms" }}>
              Crea la tua istanza, porta la tua chiave AI. I tuoi dati restano tuoi.
            </p>
          </div>

          {/* Device / product proof */}
          <div className="lp-reveal justify-self-center md:justify-self-end" style={{ animationDelay: "220ms" }}>
            <div className="w-[248px] overflow-hidden rounded-[2rem] border-[6px] border-[#0b111f] bg-[#0b111f] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)] sm:w-[272px]">
              <Image
                src="/landing/dashboard.png"
                alt="La Home di FamilySherpa: le prossime scadenze della famiglia e la previsione di spesa"
                width={840}
                height={1800}
                priority
                className="h-auto w-full rounded-[1.6rem]"
              />
            </div>
          </div>
        </div>

        {/* Cream peaks forming the horizon between the navy sky and the paper body */}
        <svg
          viewBox="0 0 1440 200"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 h-[130px] w-full md:h-[170px]"
          aria-hidden
        >
          <path d="M0 200 L360 70 L560 150 L640 120 L820 190 L1080 60 L1230 150 L1440 90 L1440 200 Z" fill="#faf7f1" />
        </svg>
      </header>

      <main className="mx-auto max-w-6xl px-5">
        {/* --------------------------------------------------------- The problem */}
        <section className="py-16 md:py-24">
          <h2 className="max-w-2xl text-[clamp(1.6rem,3.5vw,2.5rem)] font-semibold tracking-[-0.02em] text-balance">
            Bollo, TARI, RCA, la carta d&apos;identità che scade… e i piccoli.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-[#6f675b] text-pretty">
            La tachipirina «due volte al giorno per cinque giorni», l&apos;aerosol mattina e sera, la
            visita dal pediatra, il farmaco che scade nell&apos;armadietto. Vive tutto nella testa di
            qualcuno, e quello che sta nella testa, prima o poi, sfugge.
          </p>
          <ul className="mt-8 flex flex-wrap gap-2.5">
            {[
              "Bollo auto",
              "Revisione",
              "RCA",
              "TARI",
              "Bollette",
              "Carta d'identità",
              "Visita pediatrica",
              "Tachipirina a orario",
              "Aerosol mattina e sera",
              "Scadenza farmaci",
            ].map((label) => (
              <li
                key={label}
                className="rounded-full border border-[#e8e1d4] bg-white/60 px-3.5 py-1.5 text-sm text-[#4a453c]"
              >
                {label}
              </li>
            ))}
          </ul>
        </section>

        {/* -------------------------------------------------------- How it works */}
        <section className="border-t border-[#e8e1d4] py-16 md:py-24">
          <p className="text-sm font-semibold tracking-wide text-[#c2521f] uppercase">Come funziona</p>
          <h2 className="mt-2 max-w-2xl text-[clamp(1.6rem,3.5vw,2.5rem)] font-semibold tracking-[-0.02em] text-balance">
            Cattura, poi dimentica.
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              {
                n: "1",
                t: "Inoltra",
                d: "Un vocale, una foto o un PDF al bot Telegram, o caricali dall'app. Come lo diresti a voce.",
              },
              {
                n: "2",
                t: "L'AI capisce",
                d: "Estrae cos'è, quando scade, quanto costa e a quale asset appartiene, pensato per la burocrazia italiana.",
              },
              {
                n: "3",
                t: "Conferma e dimentica",
                d: "Un tocco su Conferma. Poi ci pensa lui: push e Telegram quando la scadenza, o la prossima dose, si avvicina.",
              },
            ].map((step) => (
              <div key={step.n}>
                <span className="flex size-10 items-center justify-center rounded-full bg-[#eb6834]/12 text-lg font-semibold text-[#c2521f]">
                  {step.n}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{step.t}</h3>
                <p className="mt-2 text-[#6f675b] text-pretty">{step.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ----------------------------------------------------------- Foresight */}
        <section className="grid items-center gap-12 border-t border-[#e8e1d4] py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-sm font-semibold tracking-wide text-[#c2521f] uppercase">Previsione, non archivio</p>
            <h2 className="mt-2 text-[clamp(1.6rem,3.5vw,2.5rem)] font-semibold tracking-[-0.02em] text-balance">
              Non un&apos;altra dashboard. Tranquillità.
            </h2>
            <p className="mt-4 text-lg text-[#6f675b] text-pretty">
              La Home ti mostra cosa sta arrivando, il picco di spesa dei prossimi dodici mesi e
              quanto ti costa davvero ogni asset, l&apos;auto, la casa, un figlio. Guardi avanti, non
              indietro.
            </p>
            <ul className="mt-6 space-y-2.5 text-[#4a453c]">
              {[
                "Promemoria a 30, 7, 1 e 0 giorni, via push e Telegram",
                "Previsione di cassa a 12 mesi con il mese di picco",
                "Armadietto dei farmaci con terapie e dosi da spuntare",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#eb6834]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="justify-self-center">
            <div className="w-[248px] overflow-hidden rounded-[2rem] border border-[#e8e1d4] bg-white shadow-[0_24px_50px_-24px_rgba(20,17,12,0.35)] sm:w-[280px]">
              <Image
                src="/landing/cash-flow.png"
                alt="Previsione di cassa a 12 mesi con il mese di picco evidenziato e il costo di ogni asset"
                width={840}
                height={1800}
                className="h-auto w-full"
              />
            </div>
          </div>
        </section>
      </main>

      {/* ----------------------------------------------------- Open source / trust */}
      <section className="bg-[#0f172a] text-[#f2ede3]">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
          <h2 className="max-w-2xl text-[clamp(1.6rem,3.5vw,2.5rem)] font-semibold tracking-[-0.02em] text-balance">
            Sono dati di famiglia. Restano tuoi.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-[#c7cdd9] text-pretty">
            FamilySherpa è open source (AGPL-3.0) e self-hostable: te lo installi sul tuo server, con
            la tua chiave AI. I campi sensibili, codice fiscale, note mediche e simili sono cifrati, e il codice fiscale non viene mai inviato all&apos;AI.
          </p>
          <dl className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              { t: "Self-hosted", d: "Il database è tuo. Nessun servizio in mezzo che non hai scelto." },
              { t: "Cifrato a riposo", d: "Codice fiscale e note libere sono cifrati con una chiave applicativa." },
              { t: "Porta la tua chiave", d: "Claude in BYOK; la trascrizione vocale su Groq (free tier) o OpenAI." },
            ].map((f) => (
              <div key={f.t}>
                <dt className="font-semibold">{f.t}</dt>
                <dd className="mt-1.5 text-[#c7cdd9] text-pretty">{f.d}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/signin"
              className="rounded-full bg-[#eb6834] px-6 py-3 font-medium text-white transition-colors hover:bg-[#d95926]"
            >
              Accedi
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 font-medium text-[#f2ede3] transition-colors hover:bg-white/10"
            >
              <GithubGlyph className="size-4" />
              Ospitala tu stesso
            </a>
          </div>
        </div>

        <footer className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 py-8 sm:flex-row sm:items-center">
            <span className="flex items-center gap-2 font-semibold">
              <BrandMark className="size-6" />
              FamilySherpa
            </span>
            <p className="text-sm text-[#8b93a3]">
              <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-white">
                GitHub
              </a>
              {" · "}
              AGPL-3.0
              {" · "}
              Fatto per le famiglie che portano tutto in testa.
            </p>
          </div>
        </footer>
      </section>
    </div>
  );
}
