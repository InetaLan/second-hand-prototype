import { ReactNode, useEffect, useState } from "react"
import { CATALOG, COMPARABLES, DEMO_PHOTOS, DemoKind, Product, wardrobe } from "./data"
import { inspectPhoto, recognitionFor } from "./ai"
import { Draft, Persona, StoreProvider, useStore, View } from "./store"
import { Icon, Logo, Modal } from "./ui"
import { applyRecognition, newDraft, SellFlow } from "./SellFlow"

const PERSONAS: Record<Persona, { name: string; role: string; initial: string }> = {
  ruta: { name: "Rūta", role: "R1 · retkarčiais parduoda", initial: "R" },
  mantas: { name: "Mantas", role: "R2 · perpardavėjas", initial: "M" },
}

function NavItem({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick} aria-current={active ? "page" : undefined}>
      <Icon name={icon} size={21} />
      <span>{label}</span>
    </button>
  )
}

function Shell({ children }: { children: ReactNode }) {
  const { view, go, persona, setPersona } = useStore()
  const nav = [
    ["home", "Pradžia", "home"],
    ["sell", "Parduoti", "plus"],
    ["listings", "Mano skelbimai", "tag"],
    ["about", "Apie DI", "info"],
  ] as const
  const me = PERSONAS[persona]
  return (
    <div className="app-shell">
      <aside className="side-nav">
        <Logo />
        <nav>
          {nav.map(([key, label, icon]) => (
            <NavItem key={key} icon={icon} label={label} active={view === key} onClick={() => go(key)} />
          ))}
        </nav>
        <div className="persona-switch">
          <span className="eyebrow">ROLĖ (PERSONA)</span>
          {(Object.keys(PERSONAS) as Persona[]).map((p) => (
            <button key={p} className={persona === p ? "on" : ""} onClick={() => setPersona(p)}>
              <span className="avatar">{PERSONAS[p].initial}</span>
              <span><strong>{PERSONAS[p].name}</strong><small>{PERSONAS[p].role}</small></span>
            </button>
          ))}
        </div>
        <div className="nav-foot">
          <div className="avatar">{me.initial}</div>
          <div>
            <strong>{me.name}</strong>
            <span>{me.role}</span>
          </div>
          <Icon name="more" size={18} />
        </div>
      </aside>
      <main>
        <DemoIndicator />
        {children}
      </main>
      <nav className="mobile-nav">
        {nav.map(([key, label, icon]) => (
          <NavItem key={key} icon={icon} label={label} active={view === key} onClick={() => go(key)} />
        ))}
      </nav>
    </div>
  )
}

// Visible reminder that a simulated failure mode is switched on
function DemoIndicator() {
  const { demo, setDemo } = useStore()
  if (!demo.offline && !demo.slowAI) return null
  return (
    <div className="demo-indicator" role="status">
      <Icon name="settings" size={14} />
      <span>Testavimo režimas: {[demo.offline && "DI nepasiekiamas", demo.slowAI && "DI vėluoja"].filter(Boolean).join(" · ")}</span>
      <button onClick={() => setDemo({ slowAI: false, offline: false })}>Išjungti</button>
    </div>
  )
}

/* ---------- Test cases: success / AI error / low confidence per function ---------- */
type Case = { id: string; fn: "F1" | "F2"; kind: "ok" | "fail" | "low"; title: string; notice: string; run: () => Promise<void> }

function useCases(): Case[] {
  const store = useStore()
  const tone = store.persona === "mantas" ? "dalykiškas" : "paprastas"
  const photosOf = async (kinds: DemoKind[]) =>
    Promise.all(kinds.map(async (k) => ({ src: DEMO_PHOTOS[k], demo: k, isLabel: k === "label", quality: (await inspectPhoto(DEMO_PHOTOS[k])).quality })))
  const startSell = async (kinds: DemoKind[], demo = { slowAI: false, offline: false }) => {
    store.setDemo(demo)
    store.setDraft({ ...newDraft(tone), photos: await photosOf(kinds), fresh: true })
    store.go("sell")
  }
  const startPrice = async (removed: number, demo = { slowAI: false, offline: false }) => {
    store.setDemo(demo)
    const d = newDraft(tone)
    let { fields } = applyRecognition(d.fields, recognitionFor("sweaterLabel"), tone, false)
    fields = {
      ...fields,
      brand: { ...fields.brand, value: "Champion", source: "user" },
      size: { value: "M", source: "user" },
      condition: { value: "Labai gera", source: "user" },
      defects: { value: "Be defektų", source: "user" },
    }
    const filled = applyRecognition(fields, {}, tone, false).fields
    const draft: Draft = { ...d, fresh: true, photos: await photosOf(["sweater", "label"]), fields: filled, mode: "ai", aiFields: filled, step: "price", removedComps: COMPARABLES.slice(0, removed).map((c) => c.id) }
    store.setDraft(draft)
    store.go("sell")
  }
  return [
    { id: "f1-ok", fn: "F1", kind: "ok", title: "Džemperis + etiketė", notice: "✓ kategorija, spalva, sudėtis; ? ženklas su 3 variantais; ✎ dydis, būklė, defektai.", run: () => startSell(["sweater", "label"]) },
    { id: "f1-multi", fn: "F1", kind: "fail", title: "Keli daiktai kadre (A1)", notice: "DI klausia „Kurį daiktą parduodate?“ — pasirenkate daiktą ar rinkinį.", run: () => startSell(["multi"]) },
    { id: "f1-slow", fn: "F1", kind: "fail", title: "DI vėluoja > 8 s (E2)", notice: "Pasiūloma pildyti patiems; DI vėliau užpildo tik tuščius laukus.", run: () => startSell(["sweater", "label"], { slowAI: true, offline: false }) },
    { id: "f1-off", fn: "F1", kind: "fail", title: "DI nepasiekiamas (E6)", notice: "Forma veikia be DI, juodraštis saugomas; grįžus ryšiui siūloma užpildyti.", run: () => startSell(["sweater"], { slowAI: false, offline: true }) },
    { id: "f1-dark", fn: "F1", kind: "low", title: "Tamsi nuotrauka (E1, E7)", notice: "Kokybės įspėjimas prieš DI; „Tęsti vis tiek“ — DI funkcijos nepasiekiamos, laukus pildote patys.", run: () => startSell(["dark"]) },
    { id: "f1-nolabel", fn: "F1", kind: "low", title: "Be etiketės nuotraukos", notice: "Sudėtis lieka tuščia („DI nenustatė“), ženklas — „?“.", run: () => startSell(["sweater"]) },
    { id: "f2-ok", fn: "F2", kind: "ok", title: "14 palyginamų prekių", notice: "Taisyklės intervalas per < 1 s, po ~2 s DI: 12–18 €, aukštas patikimumas, 3 strategijos.", run: () => startPrice(0) },
    { id: "f2-off", fn: "F2", kind: "fail", title: "DI nepasiekiamas / vėluoja (E2)", notice: "Rodomas tik orientacinis taisyklės intervalas; galima įvesti savo kainą.", run: () => startPrice(0, { slowAI: false, offline: true }) },
    { id: "f2-dev", fn: "F2", kind: "fail", title: "Netinkama ar nutolusi kaina (E8)", notice: "Įveskite „0“ arba „abc“ — klaida; „6“ — įspėjimas > 40 % [Palikti] [Keisti].", run: () => startPrice(0) },
    { id: "f2-low", fn: "F2", kind: "low", title: "Tik 7 palyginamos (< 8)", notice: "Žemas patikimumas, orientacinis intervalas ir raginimas pasitikrinti.", run: () => startPrice(7) },
  ]
}

function TestCases({ compact = false }: { compact?: boolean }) {
  const cases = useCases()
  const [busy, setBusy] = useState("")
  const kinds = { ok: "Sėkmė", fail: "DI klysta / nėra atsakymo", low: "Žemas pasitikėjimas" }
  return (
    <div className={`cases ${compact ? "compact" : ""}`}>
      {(["F1", "F2"] as const).map((fn) => (
        <div key={fn} className="case-col">
          <h3>{fn === "F1" ? "F1 „Skelbimas iš nuotraukų“" : "F2 „Kiek prašyti?“"}</h3>
          {cases.filter((c) => c.fn === fn).map((c) => (
            <button
              key={c.id}
              className={`case ${c.kind}`}
              disabled={!!busy}
              onClick={async () => {
                setBusy(c.id)
                await c.run()
                setBusy("")
              }}
            >
              <em>{kinds[c.kind]}</em>
              <strong>{busy === c.id ? "Ruošiama…" : c.title}</strong>
              <span>{c.notice}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

/* ---------- Home ---------- */
function ProductCard({ p }: { p: Product }) {
  const { openProduct, saved, toggleSaved } = useStore()
  return (
    <article className="product-card" onClick={() => openProduct(p)}>
      <div className="product-image">
        <img src={p.image} alt={p.title} loading="lazy" />
        {p.aiAssisted && <span><Icon name="sparkle" size={10} /> Aprašyta su DI</span>}
        <button aria-label="Išsaugoti" className={saved.includes(p.id) ? "on" : ""} onClick={(e) => { e.stopPropagation(); toggleSaved(p.id) }}>
          <Icon name="heart" />
        </button>
      </div>
      <div className="product-info">
        <span>{p.brand} · {p.size}</span>
        <h3>{p.title}</h3>
        <strong>{p.price} €</strong>
      </div>
    </article>
  )
}

function Home() {
  const { go, draft, persona, setPersona, listings } = useStore()
  const me = PERSONAS[persona]
  const feed = [...listings.filter((l) => l.status === "active"), ...CATALOG.filter((p) => !p.sponsored)].slice(0, 8)
  const hour = new Date().getHours()
  return (
    <div className="page home-page">
      <header className="topbar">
        <div className="mobile-logo"><Logo /></div>
        <span>{hour < 12 ? "Labas rytas" : hour < 18 ? "Laba diena" : "Labas vakaras"}, {me.name}</span>
        <button className="persona-chip" onClick={() => setPersona(persona === "ruta" ? "mantas" : "ruta")} title="Keisti rolę (personą)">
          <span className="avatar">{me.initial}</span> {me.name} <small>keisti</small>
        </button>
      </header>
      <section className="hero">
        <div className="hero-photo" style={{ backgroundImage: `url(${wardrobe})` }} />
        <div className="hero-content">
          <span className="eyebrow">PAPRASČIAU. GREIČIAU. ATSAKINGIAU.</span>
          <h1>Duokite daiktams<br />antrą kartą.</h1>
          <p>Nufotografuokite — DI padės aprašyti ir pagrįstai įkainoti. Paskelbiate tik jūs.</p>
          <button className="primary light" onClick={() => go("sell")}>
            <Icon name="camera" size={18} /> {draft ? "Tęsti juodraštį" : "Kurti skelbimą"}
          </button>
        </div>
      </section>

      {draft && (draft.photos.length > 0 || draft.fields.category.value) && (
        <section className="home-section">
          <button className="draft-card" onClick={() => go("sell")}>
            {draft.photos[0] ? <img src={draft.photos[0].src} alt="" /> : <span className="ai-orb"><Icon name="edit" /></span>}
            <div>
              <span className="eyebrow">NEBAIGTAS JUODRAŠTIS</span>
              <h3>{draft.fields.title.value || "Skelbimas be pavadinimo"}</h3>
              <p>Išsaugotas automatiškai {new Date(draft.updatedAt).toLocaleString("lt-LT", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })} · žingsnis: {{ photos: "nuotraukos", details: "informacija", price: "kaina", preview: "peržiūra" }[draft.step]}</p>
            </div>
            <Icon name="arrow" />
          </button>
        </section>
      )}

      <section className="home-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">DI FUNKCIJOS</span>
            <h2>Ką norėtumėte padaryti?</h2>
          </div>
        </div>
        <div className="action-grid">
          <button className="action-card coral" onClick={() => go("sell")}>
            <span className="action-icon"><Icon name="sparkle" size={24} /></span>
            <div>
              <h3>F1 · Skelbimas iš nuotraukų</h3>
              <p>Įkelkite nuotraukas — DI pasiūlys kategoriją, atributus ir aprašymą. Jūs patikrinate ir patvirtinate.</p>
            </div>
            <Icon name="arrow" />
          </button>
          <button className="action-card green" onClick={() => go("sell")}>
            <span className="action-icon"><Icon name="tag" size={24} /></span>
            <div>
              <h3>F2 · Kiek prašyti?</h3>
              <p>Kainos intervalas pagal panašias parduotas prekes ir 3 strategijos. Kainą pasirenkate jūs.</p>
            </div>
            <Icon name="arrow" />
          </button>
        </div>
        {persona === "mantas" && (
          <p className="persona-tip"><Icon name="info" size={15} /> Mantai, aprašymai numatytai rašomi dalykišku tonu, o po paskelbimo galite iškart kurti kitą skelbimą. Prabangių ženklų skelbimus tikrina moderatorius.</p>
        )}
      </section>

      <section className="home-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">TESTAVIMO ATVEJAI</span>
            <h2>Išbandykite visus scenarijus</h2>
            <p className="subcopy">Kiekvienai funkcijai — sėkmės atvejis, DI klaida ar atsakymo nebuvimas ir žemas pasitikėjimas.</p>
          </div>
        </div>
        <TestCases />
      </section>

      <section className="home-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PIRKĖJO VAIZDAS</span>
            <h2>Naujausi skelbimai</h2>
          </div>
        </div>
        <div className="product-grid home-grid">
          {feed.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      <section className="home-section trust-strip">
        <div>
          <span className="tiny-icon"><Icon name="eye" /></span>
          <h3>Jūs sprendžiate</h3>
          <p>DI tik siūlo — kiekvieną lauką ir kainą patvirtinate jūs.</p>
        </div>
        <div>
          <span className="tiny-icon"><Icon name="info" /></span>
          <h3>Aišku, kodėl</h3>
          <p>Prie kiekvieno pasiūlymo — „Kodėl?“ ir pasitikėjimo žymė.</p>
        </div>
        <div>
          <span className="tiny-icon"><Icon name="check" /></span>
          <h3>Nuotraukos saugios</h3>
          <p>Vietos duomenys pašalinami, mokymui — tik su sutikimu.</p>
        </div>
      </section>
    </div>
  )
}

/* ---------- My listings ---------- */
function Listings() {
  const { listings, setListings, go, draft, openProduct, toast } = useStore()
  const [confirm, setConfirm] = useState<Product | null>(null)
  return (
    <div className="page list-page">
      <header className="flow-header">
        <span />
        <div><span className="eyebrow">PARDAVĖJAS</span><h2>Mano skelbimai</h2></div>
        <button className="text-btn" onClick={() => go("sell")}>+ Naujas</button>
      </header>
      <section className="flow-content">
        {draft && (draft.photos.length > 0 || draft.fields.category.value) && (
          <div className="listing-row draft" onClick={() => go("sell")}>
            {draft.photos[0] ? <img src={draft.photos[0].src} alt="" /> : <span className="ai-orb"><Icon name="edit" /></span>}
            <div><strong>{draft.fields.title.value || "Skelbimas be pavadinimo"}</strong><span>Juodraštis · išsaugotas automatiškai</span></div>
            <em className="status draft">Juodraštis</em>
            <button className="text-btn">Tęsti</button>
          </div>
        )}
        {listings.length === 0 && !draft && (
          <div className="empty-state">
            <span className="ai-orb"><Icon name="tag" /></span>
            <h2>Kol kas skelbimų nėra</h2>
            <p>Sukurkite pirmąjį — DI padės per kelias minutes.</p>
            <button className="primary" onClick={() => go("sell")}>Kurti skelbimą</button>
          </div>
        )}
        {listings.map((l) => (
          <div className="listing-row" key={l.id} onClick={() => openProduct(l)}>
            {l.image ? <img src={l.image} alt="" /> : <span className="ai-orb"><Icon name="image" /></span>}
            <div>
              <strong>{l.title}</strong>
              <span>{l.brand} · {l.size} · {l.price} € {l.aiAssisted && <> · <Icon name="sparkle" size={11} /> parengta su DI</>}</span>
            </div>
            <em className={`status ${l.status}`}>{l.status === "active" ? "Aktyvus" : "Tikrina moderatorius"}</em>
            <button className="icon-btn" aria-label="Pašalinti skelbimą" onClick={(e) => { e.stopPropagation(); setConfirm(l) }}><Icon name="trash" size={16} /></button>
          </div>
        ))}
      </section>
      <Modal open={!!confirm} onClose={() => setConfirm(null)} label="Pašalinti skelbimą">
        <div className="compare">
          <h2>Pašalinti skelbimą?</h2>
          <p className="small">„{confirm?.title}“ nebebus matomas pirkėjams.</p>
          <div className="btn-row">
            <button
              className="primary danger"
              onClick={() => {
                const removed = confirm!
                setListings((ls) => ls.filter((x) => x.id !== removed.id))
                setConfirm(null)
                toast("Skelbimas pašalintas.", { label: "Atšaukti", run: () => setListings((ls) => [removed, ...ls]) })
              }}
            >
              Pašalinti
            </button>
            <button className="secondary" onClick={() => setConfirm(null)}>Palikti</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ---------- About AI: model, FP/FN, HITL, guidelines, settings ---------- */
function About() {
  const { demo, setDemo, consent, setConsent, toast } = useStore()
  return (
    <div className="page about-page">
      <header className="flow-header">
        <span />
        <div><span className="eyebrow">SKAIDRUMAS</span><h2>Apie DI</h2></div>
        <span />
      </header>
      <section className="flow-content about">
        <h1>Kaip veikia DI „Antrame karte“</h1>
        <p className="subcopy">Prototipe skaičiavimo dalis yra „juoda dėžė“: rezultatai imituojami, tačiau nuotraukų kokybės ir spalvos patikra veikia su tikrais pikseliais. Žemiau — kaip modeliai turėtų būti apmokyti.</p>

        <div className="about-grid">
          <article>
            <span className="eyebrow">F1 · SKELBIMAS IŠ NUOTRAUKŲ</span>
            <h3>Duomenys ir modeliai</h3>
            <dl>
              <dt>Duomenų rinkinys</dt>
              <dd>~250 tūkst. platformos skelbimų nuotraukų su pardavėjų patvirtintais atributais (silpnos žymės) + ~20 tūkst. rankiniu būdu anotuotų: daiktų ribos (bounding box), kategorija (13 klasių, daugiaklasis klasifikavimas), spalva (10 klasių), raštas, logotipai (~300 ženklų), etiketės teksto sritys.</dd>
              <dt>Daiktų aptikimas</dt>
              <dd>Objektų aptikimo modelis (YOLOv8 / DETR) — kiek daiktų kadre ir kur jie yra (A1).</dd>
              <dt>Atributų atpažinimas</dt>
              <dd>Vaizdo enkoderis (ViT / CLIP), papildomai apmokytas su atskiromis „galvomis“ kategorijai, spalvai, ženklui. Pasitikėjimas kalibruojamas (temperature scaling, ECE ≤ 0,05), kad slenksčiai 0,90 / 0,60 atitiktų tikrą tikslumą.</dd>
              <dt>Etiketės OCR</dt>
              <dd>OCR modelis (PaddleOCR / TrOCR) + taisyklių analizatorius sudėčiai („80% COTTON“ → „80 % medvilnė“), vertimas LT/EN.</dd>
              <dt>Aprašymo generavimas (GenAI)</dt>
              <dd>Didelis kalbos modelis su griežtu kontekstu: tik pardavėjo patvirtinti laukai + platformos stiliaus gairės ir taksonomija (RAG). Tonas — pasirinktas naudotojo. Kontrolės taškai: faktų patikra (NLI / lietuviškas BERT, pvz., LitLat BERT ar XLM-R) — aprašyme negali būti faktų, kurių nėra laukuose; draudžiami žodžiai „nauja“, „100 % vilna“ be įrodymo.</dd>
            </dl>
          </article>
          <article>
            <span className="eyebrow">F2 · KIEK PRAŠYTI?</span>
            <h3>Duomenys ir modeliai</h3>
            <dl>
              <dt>Duomenų rinkinys</dt>
              <dd>Parduotų prekių istorija per 90 d. (jei mažai — 180 d.): faktinė pardavimo kaina, dienos iki pardavimo, kategorija, ženklas, būklė, sezonas, nuotraukos vaizdo vektorius. Asmeniniai pardavėjo duomenys nenaudojami.</dd>
              <dt>Palyginamų prekių paieška</dt>
              <dd>Artimiausių kaimynų paieška (kNN) pagal CLIP vaizdo vektorius + atributų filtrai; klasterizavimas pagal stilių retiems ženklams.</dd>
              <dt>Kainos intervalas</dt>
              <dd>Kvantilinė regresija (pvz., LightGBM su kvantiline nuostolio funkcija, α = 0,25 / 0,5 / 0,75). Asimetrinis vertinimas — per maža kaina baudžiama labiau. Kalibracija: faktinė kaina patenka į Q25–Q75 45–55 % atvejų.</dd>
              <dt>Pardavimo trukmė</dt>
              <dd>Išgyvenamumo (survival) modelis — „~3 d. / ~7 d. / 14+ d.“ prie strategijų.</dd>
              <dt>Šaltas startas</dt>
              <dd>Kai palyginamų &lt; 8 — taisyklė: to paties ženklo ir kategorijos mediana × būklės koeficientas, žymima „žemas patikimumas“.</dd>
            </dl>
          </article>
        </div>

        <h2 className="about-h2">Kas brangiau — FP ar FN?</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Sprendimas</th><th>Brangesnė klaida</th><th>Kodėl (rolei)</th><th>Kaip matosi UI</th></tr></thead>
            <tbody>
              <tr><td>F1 atributai (ženklas, kategorija)</td><td><b>FP</b> — klaidinga reikšmė su ✓</td><td>Mantui — ginčai, klastotės įtarimas, paskyros blokavimas; Rūtai — grąžinimai.</td><td>✓ tik nuo 0,90; 0,60–0,89 — „?“ ir 3 variantai, laukas tuščias kol pasirenkate; &lt; 0,60 — tuščias. Prabangūs ženklai — moderacija.</td></tr>
              <tr><td>F1 kelių daiktų aptikimas</td><td><b>FN</b> — nepastebėtas antras daiktas</td><td>Aprašomi abu daiktai — neatitikimas aprašymui.</td><td>Prioritetas recall: geriau paklausti „Kurį daiktą parduodate?“ be reikalo.</td></tr>
              <tr><td>F1 aprašymas</td><td><b>FP</b> — išgalvotas faktas</td><td>Rūta bijo, kad DI parašys „nauja“, kai yra dėmė.</td><td>Aprašymas tik iš patvirtintų laukų, ✦ žymė, privalomas patvirtinimas „Už turinį atsakau aš“.</td></tr>
              <tr><td>F2 kaina</td><td><b>Per maža kaina</b> (FP „pigu“)</td><td>Negrįžtamas finansinis nuostolis — prekė nuperkama iškart; per didelę galima sumažinti.</td><td>Kaina neįrašoma automatiškai, intervalas vietoj vieno skaičiaus, &gt; 40 % nuokrypio įspėjimas pabrėžia nuostolį, žemas patikimumas kai &lt; 8 palyginamų.</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="about-h2">Žmogaus kontrolė (HITL): kada ir kaip įsikišate</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Trigeris</th><th>HITL veiksmas</th></tr></thead>
            <tbody>
              <tr><td>Prasta nuotrauka (E1)</td><td>Įkelti iš naujo arba „Tęsti vis tiek“ — tada DI išjungiamas ir laukai pildomi rankiniu būdu</td></tr>
              <tr><td>Kadre &gt; 1 daiktas (A1)</td><td>Pasirinkti daiktą arba „Visi kartu – rinkinys“</td></tr>
              <tr><td>Laukas „?“ (pasitikėjimas 0,60–0,89)</td><td>Pasirinkti vieną iš 3 variantų arba įvesti savo</td></tr>
              <tr><td>Laukas ✎ (dydis, būklė, defektai)</td><td>Privaloma įvesti — DI to nemato</td></tr>
              <tr><td>Pataisytas ✓ laukas (A3)</td><td>„Prieš / po“: [Priimti] [Atšaukti] susijusiems laukams</td></tr>
              <tr><td>Bet kuris DI laukas</td><td>„Kodėl?“, ↻, „Grąžinti DI versiją“, „Neteisinga“</td></tr>
              <tr><td>Kaina</td><td>Aktyvus strategijos pasirinkimas arba sava kaina; „Ne tas pats“ palyginamai prekei</td></tr>
              <tr><td>Kaina nutolusi &gt; 40 % (E8)</td><td>[Palikti] [Keisti]</td></tr>
              <tr><td>Paskelbimas</td><td>Privalomas patvirtinimas + „Atšaukti“ 10 s</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="about-h2">Testavimo nustatymai</h2>
        <div className="settings">
          <label className="switch">
            <input type="checkbox" checked={demo.slowAI} onChange={(e) => setDemo({ ...demo, slowAI: e.target.checked })} />
            <span />
            DI vėluoja (atpažinimas &gt; 8 s, kaina &gt; 3 s)
          </label>
          <label className="switch">
            <input type="checkbox" checked={demo.offline} onChange={(e) => setDemo({ ...demo, offline: e.target.checked })} />
            <span />
            DI paslauga nepasiekiama
          </label>
          <label className="switch">
            <input type="checkbox" checked={consent.training} onChange={(e) => setConsent({ ...consent, training: e.target.checked })} />
            <span />
            Leisti naudoti mano nuotraukas DI tobulinti
          </label>
          <button
            className="outline-btn"
            onClick={() => {
              ;["ak.listings", "ak.saved", "ak.draft", "ak.demo", "ak.consent", "ak.persona"].forEach((k) => localStorage.removeItem(k))
              toast("Prototipo duomenys išvalyti.")
              setTimeout(() => location.reload(), 600)
            }}
          >
            <Icon name="trash" size={14} /> Išvalyti prototipo duomenis
          </button>
        </div>
        <TestCases compact />
      </section>
    </div>
  )
}

/* ---------- Buyer view of a listing ---------- */
function ProductModal() {
  const { product, closeProduct, saved, toggleSaved } = useStore()
  const [original, setOriginal] = useState(false)
  useEffect(() => setOriginal(false), [product])
  const p = product?.p
  return (
    <Modal open={!!p} onClose={closeProduct} wide label={p?.title || "Skelbimas"}>
      {p && (
        <div className="product-modal">
          <img src={p.image} alt={p.title} />
          <div>
            <span className="eyebrow">{p.brand.toUpperCase()}</span>
            <h2>{p.title}</h2>
            <strong className="price">{p.price} €</strong>
            <p className="meta">{p.size} · {p.condition} · {p.color}{p.composition ? ` · ${p.composition}` : ""}</p>
            {p.aiAssisted && <p className="ai-badge"><Icon name="sparkle" size={13} /> Aprašymas parengtas su DI, patvirtino pardavėjas</p>}
            {p.status === "moderation" && <p className="ai-badge amber"><Icon name="clock" size={13} /> Laukia moderatoriaus patikrinimo</p>}
            <p className="desc">{original && p.original ? p.original : p.description}</p>
            {p.original && (
              <button className="link" onClick={() => setOriginal((x) => !x)}>
                <Icon name="globe" size={13} /> {original ? "Rodyti vertimą" : "Išversta su DI · rodyti originalą"}
              </button>
            )}
            <div className="seller"><span className="avatar">{p.seller[0]}</span><div><strong>{p.seller}</strong><span>★ {p.rating.toFixed(1)}</span></div></div>
            <div className="btn-row">
              <button className={`secondary ${saved.includes(p.id) ? "on" : ""}`} onClick={() => toggleSaved(p.id)}>
                <Icon name="heart" size={16} /> {saved.includes(p.id) ? "Išsaugota" : "Išsaugoti"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Screens() {
  const { view, go } = useStore()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [view])
  return (
    <Shell>
      {view === "home" && <Home />}
      {view === "sell" && <SellFlow exit={() => go("home")} />}
      {view === "listings" && <Listings />}
      {view === "about" && <About />}
      <ProductModal />
    </Shell>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Screens />
    </StoreProvider>
  )
}
