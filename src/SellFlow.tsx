import { ChangeEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { BRANDS, CATEGORIES, COLORS, CONDITIONS, DEMO_PHOTOS, DemoKind, LUXURY, MULTI_ITEMS, Recognition, SIZES } from "./data"
import { confWord, Facts, inspectPhoto, makeDescription, makeTitle, recognitionFor, Tone, wait } from "./ai"
import { Draft, Field, FieldKey, Photo, useStore } from "./store"
import { Confidence, ConfKind, Highlight, Icon, Modal } from "./ui"
import { PriceStep } from "./PriceStep"

const FIELD_ORDER: FieldKey[] = ["title", "category", "brand", "color", "size", "condition", "composition", "defects", "description"]
const LABELS: Record<FieldKey, string> = {
  title: "Pavadinimas",
  category: "Kategorija",
  brand: "Prekės ženklas",
  color: "Spalva",
  size: "Dydis",
  condition: "Būklė",
  composition: "Sudėtis",
  defects: "Defektai",
  description: "Aprašymas",
}
const REQUIRED: FieldKey[] = ["title", "category", "brand", "color", "size", "condition", "defects", "description"]
const HUMAN_ONLY: FieldKey[] = ["size", "condition", "defects"]
const OPTIONS: Partial<Record<FieldKey, string[]>> = { category: CATEGORIES, color: COLORS, size: SIZES, condition: CONDITIONS }

const empty = (): Field => ({ value: "", source: "empty" })
export const newDraft = (tone: Tone): Draft => ({
  id: `d${Date.now()}`,
  step: "photos",
  photos: [],
  fields: Object.fromEntries(FIELD_ORDER.map((k) => [k, empty()])) as Record<FieldKey, Field>,
  tone,
  mode: "pending",
  removedComps: [],
  updatedAt: Date.now(),
})
export const facts = (f: Record<FieldKey, Field>): Facts => ({
  category: f.category.value,
  color: f.color.value,
  brand: f.brand.value,
  size: f.size.value,
  condition: f.condition.value,
  defects: f.defects.value,
  composition: f.composition.value,
})

function regenText(fields: Record<FieldKey, Field>, tone: Tone, force: FieldKey[] = []) {
  const next = { ...fields }
  const f = facts(fields)
  if (!f.category) return next
  const auto = (k: FieldKey) => next[k].source === "ai" || (next[k].source === "empty" && next[k].aiOffered) || force.includes(k)
  if (auto("title")) {
    const t = makeTitle(f)
    next.title = { ...next.title, value: t, aiValue: t, source: "ai", aiOffered: true }
  }
  if (auto("description")) {
    const d = makeDescription(f, tone)
    next.description = { ...next.description, value: d, aiValue: d, source: "ai", aiOffered: true }
  }
  return next
}

// Turn recognition into field states using the ND2 thresholds: ✓ ≥ 0.90, ? 0.60–0.89, < 0.60 empty
export function applyRecognition(fields: Record<FieldKey, Field>, rec: Recognition, tone: Tone, onlyEmpty: boolean) {
  const next = { ...fields }
  let filled = 0
  for (const key of ["category", "brand", "color", "composition", "size"] as const) {
    const s = rec[key]
    const cur = next[key]
    if (onlyEmpty && cur.value) continue
    if (!s) {
      if (key === "size") next.size = { ...cur, why: "DI dydžio nemato — įveskite patys.", aiOffered: false }
      continue
    }
    const meta = { conf: s.conf, why: s.why, box: s.box, photo: s.photo, snippet: s.snippet }
    if (s.conf >= 0.9 && s.value) {
      next[key] = { ...meta, value: s.value, aiValue: s.value, source: "ai", aiOffered: true }
      filled++
    } else if (s.conf >= 0.6 && s.variants) {
      next[key] = { ...meta, value: "", source: "empty", variants: s.variants, aiOffered: true }
      filled++
    } else next[key] = { ...meta, value: "", source: "empty", aiOffered: false }
  }
  const before = next
  const withText = regenText(
    next,
    tone,
    (["title", "description"] as FieldKey[]).filter((k) => !onlyEmpty || !before[k].value),
  )
  for (const k of ["title", "description"] as const)
    if (!withText[k].value && !withText[k].aiOffered)
      withText[k] = { ...withText[k], aiOffered: true, why: "DI parašys, kai patvirtinsite kategoriją." }
  return { fields: withText, filled }
}

function recognitionKey(d: Draft, item?: string) {
  const main = d.photos[0]
  const hasLabel = d.photos.some((p) => p.isLabel)
  if (main?.demo === "multi") return { key: item === "sweater" ? "multiSweater" : item || "set" }
  if (main?.demo === "sweater" || main?.demo === "dark") return { key: hasLabel ? "sweaterLabel" : "sweater" }
  return { key: "upload", color: main?.quality?.colors, hasLabel }
}

type Analysis = { stage: number; label: string; slow: boolean; askItem: boolean } | null

export function SellFlow({ exit }: { exit: () => void }) {
  const store = useStore()
  const defaultTone: Tone = store.persona === "mantas" ? "dalykiškas" : "paprastas"
  const [draft, setDraftLocal] = useState<Draft>(() => store.draft ?? newDraft(defaultTone))
  const resumed = useRef(!!store.draft && !store.draft.fresh && (store.draft.photos.length > 0 || !!store.draft.fields.category.value))
  const [analysis, setAnalysis] = useState<Analysis>(null)
  const [published, setPublished] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [background, setBackground] = useState(false)
  const run = useRef(0)
  const pendingFill = useRef(false)
  const draftRef = useRef(draft)
  draftRef.current = draft

  const update = (fn: (d: Draft) => Draft) => setDraftLocal((d) => ({ ...fn(d), fresh: false, updatedAt: Date.now() }))

  // F8: autosave the draft (no AI needed)
  useEffect(() => {
    if (published) return
    const hasContent = draft.photos.length > 0 || FIELD_ORDER.some((k) => draft.fields[k].value)
    if (!hasContent) return
    const ok = store.setDraft(draft)
    setSavedAt(Date.now())
    if (!ok) store.toast("Įrenginio atmintis pilna — juodraštis išsaugotas be nuotraukų.")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  useEffect(() => () => void (run.current = -1), [])

  const startAnalysis = async (opts: { onlyEmpty?: boolean } = {}) => {
    const id = ++run.current
    const alive = () => run.current === id
    const slow = store.demo.slowAI
    const total = slow ? 11000 : 3600
    setAnalysis({ stage: 1, label: "Ieškau daiktų kadre…", slow: false, askItem: false })
    const slowTimer = setTimeout(() => alive() && setAnalysis((a) => (a ? { ...a, slow: true } : a)), 8000)
    await wait(total * 0.3)
    if (!alive()) return clearTimeout(slowTimer)
    let item = draft.item
    if (draft.photos[0]?.demo === "multi" && !opts.onlyEmpty) {
      clearTimeout(slowTimer)
      setAnalysis({ stage: 1, label: "Kadre radau 3 daiktus", slow: false, askItem: true })
      return
    }
    await continueAnalysis(id, item, total, opts.onlyEmpty ?? false, slowTimer)
  }

  const continueAnalysis = async (id: number, item: string | undefined, total: number, onlyEmpty: boolean, slowTimer?: ReturnType<typeof setTimeout>) => {
    const alive = () => run.current === id
    setAnalysis((a) => ({ stage: 2, label: "Atpažįstu atributus…", slow: a?.slow ?? false, askItem: false }))
    await wait(total * 0.35)
    if (!alive()) return
    setAnalysis((a) => (a ? { ...a, stage: 3, label: "Nuskaitau etiketę…" } : a))
    await wait(total * 0.35)
    if (slowTimer) clearTimeout(slowTimer)
    if (!alive()) return
    if (!store.aiAvailable) {
      setAnalysis(null)
      setBackground(false)
      store.toast("Ryšys su DI nutrūko. Galite pildyti patys — pasiūlysime, kai ryšys grįš.")
      update((d) => ({ ...d, step: "details", mode: "pending" }))
      return
    }
    setAnalysis(null)
    setBackground(false)
    // Computed outside the state updater so StrictMode's double call has no side effects
    const d = draftRef.current
    const { key, color, hasLabel } = recognitionKey(d, item)
    const rec = recognitionFor(key, color, hasLabel)
    const late = onlyEmpty || pendingFill.current
    pendingFill.current = false
    const { fields, filled } = applyRecognition(d.fields, rec, d.tone, late)
    if (late) store.toast(`DI užpildė ${filled} tuščius laukus. Jūsų įvestų reikšmių nekeitėme.`)
    setDraftLocal({ ...d, fields, item, mode: "ai", step: "details", aiFields: fields, fresh: false, updatedAt: Date.now() })
  }

  const chooseItem = (item: string) => {
    update((d) => ({ ...d, item }))
    const total = store.demo.slowAI ? 11000 : 3600
    continueAnalysis(run.current, item, total, false)
  }

  // E2: user stops waiting and fills manually; AI fills only empty fields later
  const fillManually = () => {
    pendingFill.current = true
    setBackground(true)
    setAnalysis(null)
    update((d) => ({ ...d, step: "details", mode: "pending" }))
  }

  const goBack = () => {
    if (draft.step === "photos") return exit()
    const prev = { details: "photos", price: "details", preview: "price" } as const
    update((d) => ({ ...d, step: prev[d.step as keyof typeof prev] }))
  }

  const saveAndExit = () => {
    store.setDraft(draft)
    store.toast("Juodraštis išsaugotas. Tęskite bet kada iš pradžios puslapio.")
    exit()
  }

  if (published) return <DoneScreen draft={draft} exit={exit} undo={() => setPublished(false)} />

  return (
    <div className="page sell-page">
      <header className="flow-header">
        <button className="icon-btn" onClick={goBack} aria-label="Atgal">
          <Icon name="back" />
        </button>
        <div>
          <span className="eyebrow">NAUJAS SKELBIMAS</span>
          <h2>Parduoti daiktą</h2>
          {savedAt && <small className="autosave"><Icon name="check" size={11} /> Juodraštis išsaugotas automatiškai</small>}
        </div>
        <button className="text-btn" onClick={saveAndExit}>
          Išsaugoti juodraštį
        </button>
      </header>
      <Progress step={draft.step} />

      {draft.step === "photos" && (
        <PhotosStep
          draft={draft}
          update={update}
          resumed={resumed.current}
          restart={() => {
            resumed.current = false
            store.setDraft(null)
            setDraftLocal(newDraft(defaultTone))
          }}
          analyze={() => startAnalysis()}
          manual={() => update((d) => ({ ...d, step: "details", mode: store.aiAvailable ? "manual" : "pending" }))}
          continueLowQuality={() => update((d) => ({ ...d, step: "details", mode: "manual", lowQuality: true }))}
          busy={!!analysis}
        />
      )}
      {draft.step === "details" && (
        <DetailsStep draft={draft} update={update} refill={() => startAnalysis({ onlyEmpty: true })} busy={!!analysis || background} />
      )}
      {draft.step === "price" && <PriceStep draft={draft} update={update} />}
      {draft.step === "preview" && <PreviewStep draft={draft} update={update} publish={() => setPublished(true)} />}

      {analysis && (
        <AnalysisOverlay
          analysis={analysis}
          photo={draft.photos[0]?.src}
          choose={chooseItem}
          manual={fillManually}
          cancel={() => {
            run.current++
            setBackground(false)
            setAnalysis(null)
          }}
        />
      )}
    </div>
  )
}

function Progress({ step }: { step: Draft["step"] }) {
  const active = { photos: 1, details: 2, price: 3, preview: 4 }[step]
  return (
    <div className="progress">
      {["Nuotraukos", "Informacija", "Kaina", "Peržiūra"].map((label, i) => (
        <div className={`progress-step ${i + 1 <= active ? "on" : ""}`} key={label}>
          <span>{i + 1 < active ? <Icon name="check" size={14} /> : i + 1}</span>
          <em>{label}</em>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Step 1: photos ---------------- */
function PhotosStep({
  draft,
  update,
  resumed,
  restart,
  analyze,
  manual,
  continueLowQuality,
  busy,
}: {
  draft: Draft
  update: (fn: (d: Draft) => Draft) => void
  resumed: boolean
  restart: () => void
  analyze: () => void
  manual: () => void
  continueLowQuality: () => void
  busy: boolean
}) {
  const store = useStore()
  const input = useRef<HTMLInputElement>(null)
  const replaceIndex = useRef<number | null>(null)
  const [checking, setChecking] = useState(false)
  const [consentOpen, setConsentOpen] = useState(false)
  const [training, setTraining] = useState(store.consent.training)
  const photos = draft.photos
  const bad = photos.filter((p) => p.quality && !p.quality.ok)

  const addFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ""
    if (!files.length) return
    const room = replaceIndex.current !== null ? 1 : 5 - photos.length
    if (files.length > room) store.toast(`Galima įkelti iki 5 nuotraukų — pridėjome ${room}.`)
    const invalid = files.filter((f) => !/^image\//.test(f.type) && !/\.heic$/i.test(f.name))
    if (invalid.length) store.toast("Tinka tik nuotraukos (JPG, PNG, HEIC).")
    setChecking(true)
    const checked: Photo[] = []
    for (const f of files.filter((f) => !invalid.includes(f)).slice(0, room)) {
      try {
        const { src, quality } = await inspectPhoto(URL.createObjectURL(f))
        checked.push({ src, quality, isLabel: false })
      } catch {
        store.toast(`Nepavyko atidaryti „${f.name}“. Pabandykite JPG ar PNG formatą.`)
      }
    }
    setChecking(false)
    update((d) => {
      const list = [...d.photos]
      if (replaceIndex.current !== null) list.splice(replaceIndex.current, 1, ...checked)
      else list.push(...checked)
      replaceIndex.current = null
      return { ...d, photos: list.slice(0, 5), mode: "pending", item: undefined, lowQuality: false }
    })
  }

  const pickDemo = async (kinds: DemoKind[]) => {
    setChecking(true)
    const list: Photo[] = []
    for (const k of kinds) {
      const { quality } = await inspectPhoto(DEMO_PHOTOS[k])
      list.push({ src: DEMO_PHOTOS[k], demo: k, isLabel: k === "label", quality })
    }
    setChecking(false)
    update((d) => ({ ...d, photos: list, item: undefined, lowQuality: false }))
  }

  const start = () => {
    if (!store.aiAvailable) return
    if (!store.consent.seen) return setConsentOpen(true)
    analyze()
  }

  return (
    <section className="flow-content narrow">
      {resumed && (
        <div className="banner info">
          <Icon name="clock" size={17} />
          <p>Tęsiate išsaugotą juodraštį. Visi duomenys ir DI būsena išliko.</p>
          <button onClick={restart}>Pradėti iš naujo</button>
        </div>
      )}
      <div className="intro">
        <span className="ai-orb"><Icon name="sparkle" size={24} /></span>
        <div>
          <h1>Pradėkime nuo nuotraukų</h1>
          <p>Įkelkite 1–5 aiškias nuotraukas. DI paruoš redaguojamą skelbimo juodraštį — skelbiate tik jūs.</p>
        </div>
      </div>

      {photos.length > 0 ? (
        <div className="photo-grid">
          {photos.map((p, i) => (
            <figure key={i} className={`thumb ${i === 0 ? "main" : ""} ${p.quality && !p.quality.ok ? "bad" : ""}`}>
              <img src={p.src} alt={`Nuotrauka ${i + 1}`} />
              <span className={`quality ${p.quality && !p.quality.ok ? "warn" : ""}`}>
                <Icon name={p.quality && !p.quality.ok ? "alert" : "check"} size={13} />
                {p.quality && !p.quality.ok ? "Prasta kokybė" : i === 0 ? "Pagrindinė · tinkama" : "Tinkama"}
              </span>
              <button className="remove" aria-label="Pašalinti nuotrauką" onClick={() => update((d) => ({ ...d, photos: d.photos.filter((_, j) => j !== i), item: undefined }))}>
                <Icon name="close" size={15} />
              </button>
              {i > 0 && (
                <label className="label-toggle">
                  <input type="checkbox" checked={p.isLabel} onChange={(e) => update((d) => ({ ...d, photos: d.photos.map((x, j) => (j === i ? { ...x, isLabel: e.target.checked } : x)) }))} />
                  Etiketė
                </label>
              )}
            </figure>
          ))}
          {photos.length < 5 && (
            <button className="thumb add" onClick={() => input.current?.click()}>
              <Icon name="plus" size={22} />
              <span>Pridėti</span>
            </button>
          )}
        </div>
      ) : (
        <button className="dropzone" onClick={() => input.current?.click()} disabled={checking}>
          <span><Icon name="upload" size={28} /></span>
          <h3>{checking ? "Tikrinama kokybė…" : "Įkelkite nuotraukas"}</h3>
          <p>JPG, PNG arba HEIC · iki 5 nuotraukų · antra gali būti etiketė</p>
          <em>Pasirinkti iš įrenginio</em>
        </button>
      )}
      <input ref={input} hidden type="file" accept="image/*,.heic" multiple onChange={addFiles} />

      {checking && photos.length > 0 && <p className="checking"><span className="spinner dark" /> Tikrinama nuotraukų kokybė…</p>}

      {bad.length > 0 && (
        <div className="banner warn" role="alert">
          <Icon name="alert" size={18} />
          <div>
            <strong>Nuotrauka gali būti netinkama DI atpažinimui</strong>
            {bad[0].quality!.issues.map((x) => <p key={x}>{x}</p>)}
            <p>DI tokios nuotraukos neatpažins. Įkelkite geresnę arba tęskite ir užpildykite laukus patys.</p>
          </div>
          <div className="banner-actions">
            <button onClick={() => { replaceIndex.current = photos.indexOf(bad[0]); input.current?.click() }}>Įkelti iš naujo</button>
            <button className="ghost" onClick={continueLowQuality}>Tęsti vis tiek</button>
          </div>
        </div>
      )}

      {photos.length > 1 && !photos.some((p) => p.isLabel) && (
        <p className="hint"><Icon name="tag" size={14} /> Jei viena nuotrauka yra etiketė, pažymėkite ją — DI nuskaitys sudėtį ir ženklą.</p>
      )}

      <div className="demo-photos">
        <span>Pavyzdinės nuotraukos testavimui:</span>
        <div>
          <button onClick={() => pickDemo(["sweater", "label"])}>Džemperis + etiketė</button>
          <button onClick={() => pickDemo(["sweater"])}>Be etiketės</button>
          <button onClick={() => pickDemo(["multi"])}>Keli daiktai kadre</button>
          <button onClick={() => pickDemo(["dark"])}>Tamsi nuotrauka</button>
        </div>
      </div>

      <div className="photo-tips">
        <h4>Geresniam rezultatui</h4>
        <div>
          <span><Icon name="check" size={14} /> Visas daiktas kadre</span>
          <span><Icon name="check" size={14} /> Natūrali šviesa</span>
          <span><Icon name="check" size={14} /> Etiketė ir sudėtis</span>
          <span><Icon name="check" size={14} /> Vienas daiktas kadre</span>
        </div>
      </div>

      {!store.aiAvailable && (
        <div className="banner error" role="alert">
          <Icon name="wifi" size={18} />
          <div>
            <strong>DI paslauga šiuo metu nepasiekiama</strong>
            <p>Formą galite pildyti patys — juodraštis saugomas įrenginyje. Grįžus ryšiui DI pasiūlys tuščių laukų reikšmes.</p>
          </div>
        </div>
      )}

      <div className="privacy-note">
        <Icon name="info" size={17} />
        <p>Prieš analizę pašalinsime vietos (EXIF) duomenis. Nuotraukos nenaudojamos DI mokymui be jūsų sutikimo.</p>
      </div>
      <div className="btn-row">
        <button className="primary wide" onClick={start} disabled={busy || checking || !photos.length || !store.aiAvailable || bad.length > 0}>
          <Icon name="sparkle" size={18} /> Užpildyti su DI
        </button>
        <button className="secondary wide" onClick={manual}>
          <Icon name="edit" size={16} /> Pildyti be DI
        </button>
      </div>
      {!photos.length && <p className="hint center">Įkelkite bent vieną nuotrauką arba pasirinkite pavyzdį.</p>}

      <Modal open={consentOpen} onClose={() => setConsentOpen(false)} label="Ką DI daro su nuotraukomis">
        <div className="consent">
          <span className="ai-orb"><Icon name="sparkle" size={22} /></span>
          <h2>Ką DI daro su nuotraukomis?</h2>
          <ul>
            <li><Icon name="check" size={15} /> Suskaičiuoja daiktus kadre ir atpažįsta kategoriją, spalvą, ženklą.</li>
            <li><Icon name="check" size={15} /> Nuskaito etiketės tekstą (sudėtis, ženklas).</li>
            <li><Icon name="check" size={15} /> Parašo pavadinimą ir aprašymą tik iš jūsų patvirtintų laukų.</li>
            <li><Icon name="close" size={15} /> <b>Nemato dydžio, defektų ir autentiškumo</b> — juos įvedate jūs.</li>
            <li><Icon name="close" size={15} /> Nieko nepaskelbia be jūsų patvirtinimo.</li>
          </ul>
          <label className="switch">
            <input type="checkbox" checked={training} onChange={(e) => setTraining(e.target.checked)} />
            <span />
            Leisti naudoti mano nuotraukas DI tobulinti
          </label>
          <p className="small">Numatytai išjungta (BDAR). Galite pakeisti bet kada skiltyje „Apie DI“.</p>
          <button
            className="primary wide"
            onClick={() => {
              store.setConsent({ seen: true, training })
              setConsentOpen(false)
              analyze()
            }}
          >
            Supratau, tęsti
          </button>
        </div>
      </Modal>
    </section>
  )
}

/* ---------------- Analysis progress, A1 item choice, E2 slow ---------------- */
function AnalysisOverlay({ analysis, photo, choose, manual, cancel }: { analysis: NonNullable<Analysis>; photo?: string; choose: (id: string) => void; manual: () => void; cancel: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="modal analysis" role="dialog" aria-modal="true" aria-label="DI analizė">
        {analysis.askItem ? (
          <>
            <span className="eyebrow">KADRE KELI DAIKTAI</span>
            <h2>Kurį daiktą parduodate?</h2>
            <p className="small">DI aprašys tik pasirinktą sritį. Spustelėkite daiktą nuotraukoje arba sąraše.</p>
            <div className="item-picker">
              {photo && <img src={photo} alt="" />}
              {MULTI_ITEMS.map((it) => (
                <button key={it.id} className="box" style={{ left: `${it.box.x}%`, top: `${it.box.y}%`, width: `${it.box.w}%`, height: `${it.box.h}%` }} onClick={() => choose(it.id)}>
                  <span>{it.label}</span>
                </button>
              ))}
            </div>
            <div className="item-list">
              {MULTI_ITEMS.map((it) => (
                <button key={it.id} onClick={() => choose(it.id)}>{it.label}</button>
              ))}
              <button onClick={() => choose("set")}><Icon name="layers" size={15} /> Visi kartu – rinkinys</button>
            </div>
            <button className="text-btn" onClick={cancel}>Atšaukti</button>
          </>
        ) : (
          <>
            <span className="ai-orb pulse"><Icon name="sparkle" size={24} /></span>
            <h2>Atpažįstu… {analysis.stage}/3</h2>
            <p className="small">{analysis.label}</p>
            <div className="bar"><i style={{ width: `${(analysis.stage / 3) * 100}%` }} /></div>
            {analysis.slow ? (
              <div className="banner warn">
                <Icon name="clock" size={17} />
                <div>
                  <strong>Užtrunka ilgiau nei įprastai</strong>
                  <p>Galite pildyti patys — DI vėliau užpildys tik tuščius laukus ir apie tai praneš.</p>
                </div>
                <div className="banner-actions">
                  <button onClick={manual}>Pildyti patys</button>
                </div>
              </div>
            ) : (
              <p className="small muted">Paprastai trunka iki 8 sekundžių</p>
            )}
            <button className="text-btn" onClick={cancel}>Atšaukti</button>
          </>
        )}
      </div>
    </div>
  )
}

/* ---------------- Step 2: AI suggestions review (HITL) ---------------- */
type Compare = { title: string; changes: { key: FieldKey; before: string; after: string }[]; apply: () => void; reject?: () => void }

function DetailsStep({ draft, update, refill, busy }: { draft: Draft; update: (fn: (d: Draft) => Draft) => void; refill: () => void; busy: boolean }) {
  const store = useStore()
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [why, setWhy] = useState<FieldKey | null>(null)
  const [compare, setCompare] = useState<Compare | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [refreshing, setRefreshing] = useState<FieldKey | null>(null)
  const [updatedNote, setUpdatedNote] = useState(false)
  const variantCounter = useRef(1)
  const f = draft.fields
  const [photoIdx, setPhotoIdx] = useState(0)

  const offered = FIELD_ORDER.filter((k) => f[k].aiOffered).length
  const toCheck = FIELD_ORDER.filter((k) => f[k].variants && !f[k].value).length

  const setFields = (fields: Record<FieldKey, Field>) => update((d) => ({ ...d, fields }))

  const change = (key: FieldKey, value: string, via: "pick" | "edit") => {
    setErrors((e) => ({ ...e, [key]: undefined }))
    const cur = f[key]
    const corrected = cur.source === "ai" && (cur.conf ?? 1) >= 0.9 && !["title", "description"].includes(key) && value !== cur.value
    const base = { ...f, [key]: { ...cur, value, source: value ? "user" : cur.variants ? "empty" : "empty" } as Field }
    if (key === "title" || key === "description") {
      setFields(base)
      return
    }
    const regenerated = regenText(base, draft.tone)
    const changes = (["title", "description"] as FieldKey[])
      .filter((k) => regenerated[k].value !== base[k].value)
      .map((k) => ({ key: k, before: base[k].value, after: regenerated[k].value }))
    if (corrected && changes.length) {
      // A3: correcting an AI field recalculates related fields — show before/after
      setFields(base)
      setCompare({ title: `Pakeitėte „${LABELS[key].toLowerCase()}“. DI perskaičiavo susijusius laukus:`, changes, apply: () => setFields({ ...regenerated }) })
      return
    }
    setFields(regenerated)
    if (changes.length && via) {
      setUpdatedNote(true)
      setTimeout(() => setUpdatedNote(false), 2600)
    }
  }

  const restore = (key: FieldKey) => {
    const cur = f[key]
    const next = { ...f, [key]: { ...cur, value: cur.aiValue ?? "", source: cur.aiValue ? "ai" : "empty" } as Field }
    setFields(key === "title" || key === "description" ? next : regenText(next, draft.tone))
    store.toast(`Grąžinta DI versija: ${LABELS[key].toLowerCase()}`)
  }

  const regenerate = async (key: FieldKey) => {
    if (!store.aiAvailable) return store.toast("DI nepasiekiamas — pergeneruoti negalima.")
    setRefreshing(key)
    await wait(900)
    setRefreshing(null)
    const fx = facts(f)
    if (key === "title" || key === "description") {
      const v = variantCounter.current++
      const after = key === "title" ? makeTitle(fx, v) : makeDescription(fx, draft.tone, v)
      const apply = () => setFields({ ...f, [key]: { ...f[key], value: after, aiValue: after, source: "ai", aiOffered: true } })
      if (f[key].source === "user") setCompare({ title: "DI pasiūlė naują versiją. Jūsų tekstas bus pakeistas:", changes: [{ key, before: f[key].value, after }], apply })
      else apply()
      return
    }
    // Attribute: re-run recognition for one field — return top-3 options instead of a single value
    const opts = OPTIONS[key] || BRANDS
    const first = f[key].aiValue || f[key].variants?.[0] || opts[0]
    const variants = Array.from(new Set([first, ...(f[key].variants || []), ...opts.filter((o) => o !== first)])).slice(0, 3)
    setFields({ ...f, [key]: { ...f[key], variants, value: "", source: "empty", conf: Math.min(f[key].conf ?? 0.75, 0.85), aiOffered: true } })
    store.toast(`DI pateikė 3 variantus laukui „${LABELS[key]}“ — pasirinkite tinkamą.`)
  }

  const setTone = (tone: Tone) => {
    const after = makeDescription(facts(f), tone)
    if (f.description.source === "user") {
      setCompare({
        title: `Tonas „${tone}“. Aprašymas bus pergeneruotas:`,
        changes: [{ key: "description", before: f.description.value, after }],
        apply: () => update((d) => ({ ...d, tone, fields: { ...d.fields, description: { ...d.fields.description, value: after, aiValue: after, source: "ai" } } })),
      })
      return
    }
    update((d) => ({ ...d, tone, fields: regenText(d.fields, tone) }))
  }

  const clearAI = () => {
    const next = { ...f }
    for (const k of FIELD_ORDER) if (next[k].source !== "user") next[k] = empty()
    update((d) => ({ ...d, fields: next, mode: "manual" }))
    setConfirmClear(false)
    store.toast("DI pasiūlymai išvalyti. Jūsų įvestos reikšmės liko.", { label: "Grąžinti", run: restoreAll })
  }
  const restoreAll = () =>
    update((d) => {
      if (!d.aiFields) return d
      const next = { ...d.fields }
      for (const k of FIELD_ORDER) if (!next[k].value && d.aiFields[k]) next[k] = d.aiFields[k]!
      return { ...d, fields: next, mode: "ai" }
    })

  const next = () => {
    const errs: Partial<Record<FieldKey, string>> = {}
    for (const k of REQUIRED) {
      if (!f[k].value.trim()) errs[k] = f[k].variants ? "Pasirinkite vieną iš DI variantų arba įveskite patys." : HUMAN_ONLY.includes(k) ? "DI to nemato — įveskite patys." : "Privalomas laukas."
    }
    if (f.title.value.length > 60) errs.title = "Pavadinimas turi būti iki 60 simbolių."
    if (f.description.value && f.description.value.length < 40) errs.description = "Aprašymas per trumpas (bent 40 simbolių)."
    setErrors(errs)
    const first = FIELD_ORDER.find((k) => errs[k])
    if (first) {
      // E4: error next to the field, focus moved there
      const el = document.getElementById(`f-${first}`)
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
      setTimeout(() => el?.focus(), 250)
      return
    }
    update((d) => ({ ...d, step: "price" }))
  }

  const mainPhoto = draft.photos[photoIdx]?.src || draft.photos[0]?.src
  const whyField = why ? f[why] : null

  return (
    <section className="flow-content details-layout">
      <aside className="sticky-photo">
        {mainPhoto ? <img src={mainPhoto} alt="Prekės nuotrauka" /> : <div className="no-photo"><Icon name="image" size={36} /><p>Nuotraukų nėra</p></div>}
        {draft.photos.length > 1 && (
          <div className="mini-thumbs">
            {draft.photos.map((p, i) => (
              <button key={i} className={i === photoIdx ? "on" : ""} onClick={() => setPhotoIdx(i)}>
                <img src={p.src} alt="" />
              </button>
            ))}
          </div>
        )}
        {draft.item && <span className="item-tag"><Icon name="layers" size={13} /> Aprašomas: {MULTI_ITEMS.find((m) => m.id === draft.item)?.label || "visas rinkinys"}</span>}
      </aside>
      <div className="form-area">
        {draft.mode === "ai" && (
          <div className="ai-summary">
            <span><Icon name="sparkle" size={19} /></span>
            <div>
              <strong>Paruošėme juodraštį</strong>
              <p>DI pasiūlė {offered} iš 9 laukų{toCheck ? ` · ${toCheck} pažymėti „?“ — pasirinkite` : ""}. Laukus su ✎ įveskite patys.</p>
            </div>
            <b>{offered} / 9</b>
          </div>
        )}
        {draft.lowQuality && (
          <div className="banner error" role="alert">
            <Icon name="alert" size={18} />
            <div><strong>DI funkcijos nepasiekiamos</strong><p>Nuotrauka per prastos kokybės atpažinimui, todėl DI laukų nesiūlo. Užpildykite juos patys arba įkelkite geresnę nuotrauką.</p></div>
            <div className="banner-actions"><button onClick={() => update((d) => ({ ...d, step: "photos" }))}>Įkelti kitą nuotrauką</button></div>
          </div>
        )}
        {draft.mode !== "ai" && !draft.lowQuality && !store.aiAvailable && (
          <div className="banner error">
            <Icon name="wifi" size={18} />
            <div><strong>Pildote be DI — paslauga nepasiekiama</strong><p>Duomenys saugomi įrenginyje. Grįžus ryšiui pasiūlysime tuščių laukų reikšmes.</p></div>
          </div>
        )}
        {draft.mode === "pending" && !draft.lowQuality && store.aiAvailable && draft.photos.length > 0 && (
          <div className="banner info">
            <Icon name="sparkle" size={18} />
            <div><strong>{busy ? "DI dar dirba fone…" : "DI pasiekiamas"}</strong><p>{busy ? "Kai baigs, užpildys tik tuščius laukus ir praneš." : "Galime pasiūlyti reikšmes tuščiems laukams. Jūsų įvestų nekeisime."}</p></div>
            {!busy && <div className="banner-actions"><button onClick={refill}>Užpildyti tuščius</button></div>}
          </div>
        )}
        <h1>Patikrinkite informaciją</h1>
        {draft.lowQuality ? (
          <p className="subcopy">Visus laukus pildote patys. Privalomi laukai pažymėti *.</p>
        ) : (
          <>
            <p className="subcopy">DI gali suklysti. Bet kurią reikšmę galite pakeisti, pergeneruoti ↻ arba grąžinti DI versiją.</p>
            <div className="legend">
              <Confidence kind="high" /> <Confidence kind="check" /> <Confidence kind="manual" /> <Confidence kind="ai" /> <Confidence kind="empty" />
            </div>
          </>
        )}
        {!draft.lowQuality && (
          <div className="banner muted">
            <Icon name="eye" size={16} />
            <p><b>DI nemato dydžio, defektų ir autentiškumo.</b> Šiuos laukus visada pildote patys.</p>
          </div>
        )}

        <div className="form-grid">
          {FIELD_ORDER.map((key) => (
            <FieldRow
              key={key}
              k={key}
              field={f[key]}
              error={errors[key]}
              refreshing={refreshing === key}
              aiOn={draft.mode === "ai" || !!f[key].aiOffered}
              onChange={(v, via) => change(key, v, via)}
              onWhy={() => setWhy(key)}
              onRegenerate={() => regenerate(key)}
              onRestore={() => restore(key)}
              tone={key === "description" ? draft.tone : undefined}
              setTone={setTone}
            />
          ))}
        </div>
        {updatedNote && <p className="updated-note"><Icon name="sparkle" size={13} /> Pavadinimas ir aprašymas atnaujinti pagal jūsų pasirinkimus</p>}
        <div className="btn-row">
          <button className="primary wide" onClick={next}>
            Toliau: kaina <Icon name="arrow" size={18} />
          </button>
        </div>
        <div className="secondary-actions">
          {draft.mode === "ai" ? (
            <button className="text-btn" onClick={() => setConfirmClear(true)}>Pildyti be DI</button>
          ) : draft.aiFields ? (
            <button className="text-btn" onClick={restoreAll}>Grąžinti DI pasiūlymus</button>
          ) : null}
        </div>
      </div>

      <Modal open={!!whyField} onClose={() => setWhy(null)} label="Kodėl DI taip pasiūlė">
        {whyField && why && <WhyPanel k={why} field={whyField} photos={draft.photos} close={() => setWhy(null)} />}
      </Modal>
      <Modal open={!!compare} onClose={() => setCompare(null)} label="Prieš ir po" wide>
        {compare && (
          <div className="compare">
            <h2>Prieš / po</h2>
            <p className="small">{compare.title}</p>
            {compare.changes.map((c) => (
              <div className="compare-row" key={c.key}>
                <span className="eyebrow">{LABELS[c.key].toUpperCase()}</span>
                <div>
                  <p className="before">{c.before || "—"}</p>
                  <p className="after">{c.after}</p>
                </div>
              </div>
            ))}
            <p className="small muted">Jūsų įvestų laukų (dydžio, būklės, defektų) DI nekeičia.</p>
            <div className="btn-row">
              <button className="primary" onClick={() => { compare.apply(); setCompare(null) }}>Priimti</button>
              <button className="secondary" onClick={() => { compare.reject?.(); setCompare(null) }}>Atšaukti</button>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} label="Pildyti be DI">
        <div className="compare">
          <h2>Pildyti be DI?</h2>
          <p className="small">Išvalysime DI pasiūlytas reikšmes. Jūsų įvestos reikšmės liks. DI pasiūlymus galėsite grąžinti.</p>
          <div className="btn-row">
            <button className="primary" onClick={clearAI}>Išvalyti DI laukus</button>
            <button className="secondary" onClick={() => setConfirmClear(false)}>Palikti</button>
          </div>
        </div>
      </Modal>
    </section>
  )
}

function badgeFor(k: FieldKey, field: Field, aiOn: boolean): ConfKind {
  if (field.source === "user") return "user"
  if ((k === "title" || k === "description") && field.source === "ai") return "ai"
  if (field.source === "ai") return "high"
  if (field.variants?.length) return "check"
  if (HUMAN_ONLY.includes(k) || !aiOn) return "manual"
  return "empty"
}

function FieldRow({
  k,
  field,
  error,
  refreshing,
  aiOn,
  onChange,
  onWhy,
  onRegenerate,
  onRestore,
  tone,
  setTone,
}: {
  k: FieldKey
  field: Field
  error?: string
  refreshing: boolean
  aiOn: boolean
  onChange: (v: string, via: "pick" | "edit") => void
  onWhy: () => void
  onRegenerate: () => void
  onRestore: () => void
  tone?: Tone
  setTone: (t: Tone) => void
}) {
  const kind = badgeFor(k, field, aiOn)
  const full = k === "title" || k === "description" || k === "defects"
  const required = REQUIRED.includes(k)
  const isAI = field.aiOffered && !HUMAN_ONLY.includes(k)
  const canRestore = field.source === "user" && (field.aiValue || field.variants?.length)
  const options = OPTIONS[k]
  let control: ReactNode
  if (k === "description") control = <textarea id={`f-${k}`} value={field.value} onChange={(e) => onChange(e.target.value, "edit")} placeholder="Aprašykite daiktą" aria-invalid={!!error} />
  else if (k === "defects")
    control = (
      <div className="defects">
        <input id={`f-${k}`} value={field.value === "Be defektų" ? "" : field.value} disabled={field.value === "Be defektų"} placeholder="Pvz., maža dėmė ant rankovės" onChange={(e) => onChange(e.target.value, "edit")} aria-invalid={!!error} />
        <label><input type="checkbox" checked={field.value === "Be defektų"} onChange={(e) => onChange(e.target.checked ? "Be defektų" : "", "pick")} /> Defektų nėra</label>
      </div>
    )
  else if (options)
    control = (
      <select id={`f-${k}`} value={field.value} onChange={(e) => onChange(e.target.value, "pick")} aria-invalid={!!error}>
        <option value="">{field.variants ? "Kita reikšmė…" : "Pasirinkite"}</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    )
  else
    control = (
      <>
        <input id={`f-${k}`} list={k === "brand" ? "brands" : undefined} value={field.value} maxLength={k === "title" ? 70 : 80} onChange={(e) => onChange(e.target.value, "edit")} placeholder={k === "brand" ? "Pradėkite rašyti ženklą" : k === "composition" ? "Pvz., 100 % medvilnė" : ""} aria-invalid={!!error} />
        {k === "brand" && <datalist id="brands">{BRANDS.map((b) => <option key={b} value={b} />)}</datalist>}
      </>
    )
  return (
    <div className={`field ${full ? "full" : ""} ${kind === "check" ? "warn" : ""} ${error ? "has-error" : ""} ${refreshing ? "refreshing" : ""}`}>
      <span>
        <label htmlFor={`f-${k}`}>{LABELS[k]}{required && <i className="req">*</i>}</label>
        <span className="field-tools">
          <Confidence kind={kind} />
          {isAI && field.why && <button type="button" onClick={onWhy} title="Kodėl?">Kodėl?</button>}
          {isAI && <button type="button" onClick={onRegenerate} title="Pergeneruoti" aria-label={`Pergeneruoti ${LABELS[k]}`}><Icon name="refresh" size={13} /></button>}
          {canRestore && <button type="button" onClick={onRestore} title="Grąžinti DI versiją"><Icon name="undo" size={13} /></button>}
        </span>
      </span>
      {tone && (
        <div className="tones" role="radiogroup" aria-label="Aprašymo tonas">
          {(["paprastas", "dalykiškas", "žaismingas"] as Tone[]).map((t) => (
            <button key={t} type="button" className={tone === t ? "on" : ""} onClick={() => setTone(t)} role="radio" aria-checked={tone === t}>{t}</button>
          ))}
        </div>
      )}
      {field.variants && !field.value && (
        <div className="variants">
          <small>DI nėra tikras ({Math.round((field.conf ?? 0.7) * 100)} %) — pasirinkite:</small>
          <div>{field.variants.map((v) => <button type="button" key={v} onClick={() => onChange(v, "pick")}>{v}</button>)}</div>
        </div>
      )}
      {control}
      {error ? (
        <small className="error" role="alert"><Icon name="alert" size={12} /> {error}</small>
      ) : k === "brand" && LUXURY.some((b) => field.value.toLowerCase().includes(b.toLowerCase())) ? (
        <small className="error"><Icon name="alert" size={12} /> Prabangus ženklas: DI autentiškumo nevertina — skelbimą prieš paskelbiant patikrins moderatorius.</small>
      ) : kind === "empty" && field.why ? (
        <small className="helper">{field.why}{k === "composition" ? " Nufotografuokite etiketę arba įrašykite patys." : ""}</small>
      ) : kind === "high" && field.snippet ? (
        <small className="helper">Iš etiketės: {field.snippet}</small>
      ) : k === "title" ? (
        <small className="helper">{field.value.length}/60 simbolių</small>
      ) : k === "description" && field.source === "ai" ? (
        <small className="helper">Parašyta tik iš patvirtintų laukų. DI nemato paslėptų defektų — perskaitykite.</small>
      ) : null}
    </div>
  )
}

function WhyPanel({ k, field, photos, close }: { k: FieldKey; field: Field; photos: Photo[]; close: () => void }) {
  const store = useStore()
  const [reporting, setReporting] = useState(false)
  const src = photos[field.photo ?? 0]?.src
  const conf = field.conf ?? 1
  return (
    <div className="why-panel">
      <span className="eyebrow">KODĖL DI TAIP PASIŪLĖ?</span>
      <h2>{LABELS[k]}: {field.value || field.variants?.join(" / ") || "nenustatyta"}</h2>
      {src && <Highlight src={src} box={field.box} />}
      <ul>
        <li><span>Šaltinis</span><b>{field.snippet ? `Etiketė (nuotrauka ${(field.photo ?? 0) + 1})` : k === "title" || k === "description" ? "Jūsų patvirtinti laukai" : `Nuotrauka ${(field.photo ?? 0) + 1}`}</b></li>
        {field.snippet && <li><span>Nuskaitytas tekstas</span><b>{field.snippet}</b></li>}
        <li><span>Pasitikėjimas</span><b>{confWord(conf)} ({Math.round(conf * 100)} %)</b></li>
        <li><span>Paaiškinimas</span><b>{field.why}</b></li>
      </ul>
      <p className="small muted">Abejokite, kai laukas pažymėtas „?“, nuotrauka tamsi, kadre keli daiktai ar ženklas prabangus.</p>
      {reporting ? (
        <div className="report">
          <p className="small">Kas neteisinga?</p>
          <div>
            {["Kita reikšmė", "Ne tas daiktas", "Nematoma nuotraukoje", "Kita"].map((r) => (
              <button
                key={r}
                onClick={() => {
                  store.toast(store.consent.training ? "Ačiū! Pataisyta reikšmė padės tobulinti DI." : "Ačiū! Užfiksavome klaidą (nuotraukos mokymui nenaudojamos).")
                  close()
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button className="outline-btn" onClick={() => setReporting(true)}><Icon name="thumbdown" size={14} /> Neteisinga</button>
      )}
    </div>
  )
}

/* ---------------- Step 4: review ---------------- */
function PreviewStep({ draft, update, publish }: { draft: Draft; update: (fn: (d: Draft) => Draft) => void; publish: () => void }) {
  const f = draft.fields
  const aiKeys = FIELD_ORDER.filter((k) => f[k].source === "ai")
  const missing = REQUIRED.filter((k) => !f[k].value)
  const filled = FIELD_ORDER.filter((k) => f[k].value).length
  const [agree, setAgree] = useState(false)
  const [tried, setTried] = useState(false)
  const aiAssisted = FIELD_ORDER.some((k) => f[k].aiOffered)
  return (
    <section className="flow-content preview-layout">
      <div>
        <span className="eyebrow">TAIP MATYS PIRKĖJAS</span>
        <div className="listing-card">
          {draft.photos[0] ? <img src={draft.photos[0].src} alt={f.title.value} /> : <div className="no-photo tall"><Icon name="image" size={36} /></div>}
          <div>
            <span className="eyebrow">{f.brand.value.toUpperCase()}</span>
            <h2>{f.title.value}</h2>
            <p>{f.size.value} · {f.condition.value}</p>
            <strong>{draft.price?.value} €</strong>
            {aiAssisted && <p className="ai-badge"><Icon name="sparkle" size={13} /> Aprašymas parengtas su DI, patvirtino pardavėjas</p>}
            <p className="desc">{f.description.value}</p>
          </div>
        </div>
      </div>
      <div className="review">
        <span className="eyebrow">PASKUTINIS ŽINGSNIS</span>
        <h1>Ar viskas teisinga?</h1>
        <p>DI pasiūlytas turinys pažymėtas ✦. Už skelbimo tikslumą atsakote jūs.</p>
        <div className="review-row">
          <div>
            <span>Informacija</span>
            <strong>{filled} iš 9 laukų užpildyti</strong>
            {aiKeys.length > 0 && <em className="ai-list">✦ DI: {aiKeys.map((k) => LABELS[k].toLowerCase()).join(", ")}</em>}
          </div>
          <button className="text-btn" onClick={() => update((d) => ({ ...d, step: "details" }))}>Keisti</button>
        </div>
        <div className="review-row">
          <div>
            <span>Kaina</span>
            <strong>{draft.price?.value} € · {draft.price?.source === "strategy" ? `pasirinkta iš DI pasiūlymo („${draft.price.strategy}“)` : "jūsų įvesta kaina"}</strong>
          </div>
          <button className="text-btn" onClick={() => update((d) => ({ ...d, step: "price" }))}>Keisti</button>
        </div>
        <div className="review-row">
          <div>
            <span>DI skaidrumas</span>
            <strong>{aiAssisted ? "Pirkėjas matys žymę „Aprašymas parengtas su DI“" : "Skelbimas sukurtas be DI"}</strong>
          </div>
          <Icon name="sparkle" />
        </div>
        {missing.length > 0 && (
          <div className="banner error" role="alert">
            <Icon name="alert" size={17} />
            <div><strong>Trūksta privalomų laukų</strong><p>{missing.map((k) => LABELS[k]).join(", ")}</p></div>
            <div className="banner-actions"><button onClick={() => update((d) => ({ ...d, step: "details" }))}>Taisyti</button></div>
          </div>
        )}
        <label className={`responsibility ${tried && !agree ? "need" : ""}`}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <p>Patikrinau DI pasiūlymus ir patvirtinu, kad aprašymas, dydis ir būklė atitinka daiktą. <b>Už turinį atsakau aš.</b></p>
        </label>
        <button
          className="primary wide"
          disabled={missing.length > 0 || !draft.price}
          onClick={() => {
            setTried(true)
            if (agree) publish()
          }}
        >
          Paskelbti skelbimą
        </button>
        {tried && !agree && <p className="error-text">Pažymėkite patvirtinimą — be jo skelbimo nepaskelbsime.</p>}
      </div>
    </section>
  )
}

/* ---------------- Publish: 10 s undo + risk check ---------------- */
function DoneScreen({ draft, exit, undo }: { draft: Draft; exit: () => void; undo: () => void }) {
  const store = useStore()
  const [left, setLeft] = useState(10)
  const [phase, setPhase] = useState<"undo" | "check" | "active" | "moderation">("undo")
  const f = draft.fields
  const risky = LUXURY.some((b) => f.brand.value.toLowerCase().includes(b.toLowerCase()))
  const listing = useMemo(
    () => ({
      id: `m${draft.id}`,
      title: f.title.value,
      brand: f.brand.value,
      category: f.category.value,
      color: f.color.value,
      size: f.size.value,
      price: draft.price?.value ?? 0,
      condition: f.condition.value,
      composition: f.composition.value || null,
      style: [],
      image: draft.photos[0]?.src || "",
      seller: store.persona === "mantas" ? "Mantas" : "Rūta",
      rating: 5,
      description: f.description.value,
      aiAssisted: FIELD_ORDER.some((k) => f[k].aiOffered),
      mine: true,
      status: (risky ? "moderation" : "active") as "moderation" | "active",
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  // Published immediately; "Atšaukti" within 10 s returns it to the draft (E5)
  useEffect(() => {
    store.setListings((l) => [listing, ...l.filter((x) => x.id !== listing.id)])
    store.setDraft(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (phase === "check") {
      const t = setTimeout(() => setPhase(risky ? "moderation" : "active"), 1400)
      return () => clearTimeout(t)
    }
    if (phase !== "undo") return
    if (left === 0) return setPhase("check")
    const t = setTimeout(() => setLeft((x) => x - 1), 1000)
    return () => clearTimeout(t)
  }, [left, phase, risky])

  return (
    <div className="page centered-page">
      <div className={`success-orbit ${phase === "moderation" ? "amber" : ""}`}>
        {phase === "check" ? <span className="spinner big" /> : <Icon name={phase === "moderation" ? "clock" : "check"} size={38} />}
      </div>
      <span className="eyebrow">{phase === "undo" ? "PASKELBTA" : phase === "check" ? "TIKRINAME SKELBIMĄ" : phase === "active" ? "SKELBIMAS AKTYVUS" : "PERŽIŪRI MODERATORIUS"}</span>
      <h1>
        {phase === "moderation" ? <>Skelbimas laukia<br />patikrinimo.</> : <>Daiktas laukia<br />antro karto.</>}
      </h1>
      {phase === "undo" && (
        <>
          <p>Skelbimas paskelbtas. Persigalvojote? Per {left} s galite atšaukti — jis grįš į juodraštį.</p>
          <button
            className="secondary"
            onClick={() => {
              store.setListings((l) => l.filter((x) => x.id !== listing.id))
              store.setDraft(draft)
              store.toast("Paskelbimas atšauktas. Skelbimas grąžintas į juodraštį.")
              undo()
            }}
          >
            <Icon name="undo" size={16} /> Atšaukti ({left})
          </button>
        </>
      )}
      {phase === "check" && <p>Automatinė rizikos patikra: draudžiamos prekės, padirbiniai, aprašymo neatitikimai…</p>}
      {phase === "active" && <p>Rizika žema — skelbimas aktyvus. Pirkėjai matys žymę „Aprašymas parengtas su DI, patvirtino pardavėjas“.</p>}
      {phase === "moderation" && <p>Prabangaus ženklo ({f.brand.value}) skelbimus peržiūri moderatorius — tikrinamas autentiškumas. Paprastai iki 24 val.</p>}
      {(phase === "active" || phase === "moderation") && (
        <div className="btn-row center">
          <button className="primary" onClick={() => store.go("listings")}>Mano skelbimai</button>
          <button className="secondary" onClick={exit}>{store.persona === "mantas" ? "Kurti kitą skelbimą" : "Grįžti į pradžią"}</button>
        </div>
      )}
    </div>
  )
}
