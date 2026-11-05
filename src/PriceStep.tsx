import { useEffect, useMemo, useRef, useState } from "react"
import { COMPARABLES, LUXURY } from "./data"
import { aiRange, PriceResult, ruleRange } from "./ai"
import { Draft, useStore } from "./store"
import { Icon, Modal } from "./ui"
import { facts } from "./SellFlow"

type Phase = "rule" | "ai"

// F2 "Kiek prašyti?" — rule interval in ≤ 1 s, AI interval ~2 s later, seller always chooses (HITL)
export function PriceStep({ draft, update }: { draft: Draft; update: (fn: (d: Draft) => Draft) => void }) {
  const store = useStore()
  const fx = facts(draft.fields)
  const [phase, setPhase] = useState<Phase>("rule")
  const [ruleReady, setRuleReady] = useState(false)
  const [slowNote, setSlowNote] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [explain, setExplain] = useState(false)
  const [howOpen, setHowOpen] = useState(false)
  const [own, setOwn] = useState(draft.price?.source === "own" ? String(draft.price.value) : "")
  const [ownError, setOwnError] = useState("")
  const [deviation, setDeviation] = useState<null | number>(null)
  const ownRef = useRef<HTMLInputElement>(null)

  // Tik tos pačios kategorijos parduotos prekės; jei jų nėra — tuščias sąrašas ir orientacinis intervalas
  const comps = COMPARABLES.filter((c) => c.category === fx.category && !draft.removedComps.includes(c.id))
  const rule = ruleRange(fx.category, fx.condition)
  const result: PriceResult = useMemo(() => aiRange(comps, fx), [draft.removedComps.length, fx.category, fx.condition, fx.brand]) // eslint-disable-line react-hooks/exhaustive-deps
  const showAI = phase === "ai" && store.aiAvailable
  const range = showAI && !result.fallback ? result : { ...result, low: rule.low, high: rule.high, mid: Math.round((rule.low + rule.high) / 2), fallback: true }
  const price = draft.price

  useEffect(() => {
    const t0 = setTimeout(() => setRuleReady(true), 350)
    if (!store.aiAvailable) return () => clearTimeout(t0)
    const slow = store.demo.slowAI
    const t1 = setTimeout(() => setSlowNote(true), 3000)
    const t2 = setTimeout(() => setPhase("ai"), slow ? 7000 : 2000)
    return () => [t0, t1, t2].forEach(clearTimeout)
  }, [store.aiAvailable, store.demo.slowAI])

  // Pasirinkta strategija seka intervalą (pvz., kai po taisyklės intervalo ateina DI intervalas); savos kainos neliečiame
  useEffect(() => {
    if (draft.price?.source !== "strategy") return
    const amount = ({ Greitai: range.low, "Rinkos kaina": range.mid, Maksimali: range.high } as Record<string, number>)[draft.price.strategy ?? ""]
    if (amount !== undefined && amount !== draft.price.value) update((d) => (d.price?.source === "strategy" ? { ...d, price: { ...d.price, value: amount } } : d))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.low, range.mid, range.high])

  const choose = (value: number, strategy: string) => {
    setOwn("")
    setOwnError("")
    setDeviation(null)
    update((d) => ({ ...d, price: { value, source: "strategy", strategy } }))
  }
  // E8: only numbers > 0; > 40 % from the median → non-blocking warning
  const applyOwn = (raw: string) => {
    setOwn(raw)
    setDeviation(null)
    const v = Number(raw.replace(",", "."))
    if (!raw.trim()) {
      setOwnError("")
      return
    }
    if (!/^\d+([.,]\d{1,2})?$/.test(raw.trim()) || !(v > 0)) {
      setOwnError("Įveskite kainą skaičiais, didesnę už 0 (pvz., 15).")
      update((d) => ({ ...d, price: d.price?.source === "own" ? undefined : d.price }))
      return
    }
    setOwnError("")
    update((d) => ({ ...d, price: { value: v, source: "own" } }))
  }
  const proceed = () => {
    if (!price) return
    if (price.source === "own" && deviation === null) {
      const dev = (price.value - range.mid) / range.mid
      if (Math.abs(dev) > 0.4) return setDeviation(dev)
    }
    update((d) => ({ ...d, step: "preview" }))
  }

  const remove = (id: string) => {
    const comp = COMPARABLES.find((c) => c.id === id)!
    update((d) => ({ ...d, removedComps: [...d.removedComps, id] }))
    store.toast(`„${comp.title}“ pašalinta — intervalas perskaičiuotas.`, {
      label: "Atšaukti",
      run: () => update((d) => ({ ...d, removedComps: d.removedComps.filter((x) => x !== id) })),
    })
  }

  const strategies: [string, number, string][] = [
    ["Greitai", range.low, "~3 d."],
    ["Rinkos kaina", range.mid, "~7 d."],
    ["Maksimali", range.high, "14+ d."],
  ]
  const min = Math.max(1, Math.floor(range.low * 0.6))
  const max = Math.ceil(range.high * 1.4)
  const pos = (v: number) => `${Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100))}%`
  const level = showAI ? result.confidence : "žemas"

  return (
    <section className="flow-content price-layout">
      <div className="price-main">
        <span className="eyebrow">KIEK PRAŠYTI?</span>
        <h1>Pasirinkite savo kainą</h1>
        <p className="subcopy">Matote, už kiek parduoti panašūs daiktai. Kainos laukas nepildomas automatiškai — sprendžiate jūs.</p>

        {LUXURY.some((b) => fx.brand.toLowerCase().includes(b.toLowerCase())) && (
          <div className="banner warn">
            <Icon name="alert" size={17} />
            <p><b>Prabangi prekė.</b> Tokių daiktų palyginamų pardavimų mažai, o kaina labai priklauso nuo autentiškumo, kurio DI nevertina. Intervalas tik orientacinis — pasitikrinkite patys.</p>
          </div>
        )}
        {!ruleReady ? (
          <div className="range-card skeleton"><span className="spinner dark" /> Skaičiuojamas orientacinis intervalas…</div>
        ) : (
          <div className={`range-card ${range.fallback ? "fallback" : ""}`}>
            <div className="range-top">
              <div>
                <span>{range.fallback ? "Orientacinis intervalas (taisyklė)" : "DI rekomenduojamas intervalas"}</span>
                <strong>{range.low}–{range.high} €</strong>
                <span>
                  {showAI && !result.fallback
                    ? `Pagal ${result.count} panašių prekių, parduotų per 90 d.`
                    : showAI && result.fallback
                      ? `Rasta tik ${result.count} palyginamų (< 8) — intervalas orientacinis dėl duomenų trūkumo`
                      : "Pagal prekės būklę ir to paties ženklo bei kategorijos medianą"}
                </span>
              </div>
              <span className={`confidence-pill ${level === "aukštas" ? "" : level === "vidutinis" ? "mid" : "low"}`}>
                <i /> {showAI ? `${level[0].toUpperCase()}${level.slice(1)} patikimumas` : "Orientacinis"}
              </span>
            </div>
            {phase === "rule" && store.aiAvailable && (
              <p className={`ai-loading ${slowNote ? "slow" : ""}`}>
                <span className="spinner dark" /> {slowNote ? "DI skaičiavimas užtrunka — kol kas rodome orientacinį intervalą. Galite rinktis jau dabar." : "DI ieško panašių parduotų prekių…"}
              </p>
            )}
            {!store.aiAvailable && (
              <p className="ai-loading slow"><Icon name="wifi" size={14} /> DI nepasiekiamas — rodomas taisyklės intervalas. Galite įvesti savo kainą.</p>
            )}
            {(level === "žemas" && showAI) && (
              <div className="banner warn small-banner">
                <Icon name="alert" size={15} />
                <p><b>Žemas patikimumas.</b> Per mažai palyginamų prekių. Pasitikrinkite kainą patys — ypač jei daiktas retas, vintažinis ar turi defektų.</p>
              </div>
            )}
            <div className="range-track" style={{ background: `linear-gradient(90deg, #e9ebe5 0 ${pos(range.low)}, ${range.fallback ? "#c9a34f" : "var(--green)"} ${pos(range.low)} ${pos(range.high)}, #e9ebe5 ${pos(range.high)})` }}>
              {price && <span style={{ left: pos(price.value) }} />}
              <em style={{ left: pos(range.low) }}>{range.low} €</em>
              <em style={{ left: pos(range.high) }}>{range.high} €</em>
            </div>
            <div className="strategies" role="radiogroup" aria-label="Kainos strategija">
              {strategies.map(([name, amount, time]) => (
                <button
                  key={name}
                  role="radio"
                  aria-checked={price?.source === "strategy" && price.strategy === name}
                  className={price?.source === "strategy" && price.strategy === name ? "selected" : ""}
                  onClick={() => choose(amount, name)}
                >
                  <span>{name}</span>
                  <strong>{amount} €</strong>
                  <em>tikėtina per {time}</em>
                </button>
              ))}
            </div>
            <label className="own-price">
              <span>Arba įveskite savo kainą</span>
              <div className={ownError ? "invalid" : ""}>
                <input ref={ownRef} inputMode="decimal" value={own} placeholder="—" onChange={(e) => applyOwn(e.target.value)} aria-invalid={!!ownError} />
                <b>€</b>
              </div>
            </label>
            {ownError && <p className="error-text" role="alert">{ownError}</p>}
            {deviation !== null && price && (
              <div className="banner warn small-banner" role="alert">
                <Icon name="alert" size={15} />
                <div>
                  <p>
                    <b>{price.value} € yra {Math.round(Math.abs(deviation) * 100)} % {deviation > 0 ? "didesnė" : "mažesnė"} už rinkos kainą ({range.mid} €).</b>{" "}
                    {deviation < 0 ? "Per maža kaina — prekė gali būti nupirkta iškart, to atšaukti nebus galima." : "Prekė gali ilgai neparsiduoti, bet kainą vėliau galėsite sumažinti."}
                  </p>
                  <div className="banner-actions inline">
                    <button onClick={() => update((d) => ({ ...d, step: "preview" }))}>Palikti {price.value} €</button>
                    <button className="ghost" onClick={() => { setDeviation(null); ownRef.current?.focus(); ownRef.current?.select() }}>Keisti</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <button className="explain-toggle" onClick={() => setExplain((x) => !x)} aria-expanded={explain}>
          <Icon name="sparkle" size={15} /> Kodėl toks intervalas? <Icon name={explain ? "close" : "arrow"} size={13} />
        </button>
        {explain && (
          <div className="explain-card">
            <p>
              {showAI && !result.fallback ? (
                <>Rasta <b>{result.count} panašių prekių</b>, parduotų per pastarąsias 90 dienų (tas pats tipas, ženklas, panaši būklė ir vaizdas). Intervalas – vidurinė 50 % pardavimo kainų dalis (Q25–Q75).</>
              ) : (
                <>Rodomas taisyklės intervalas: to paties ženklo ir kategorijos parduotų prekių mediana, pakoreguota pagal būklę. {showAI ? `Palyginamų prekių per mažai (${result.count} < 8).` : ""}</>
              )}
            </p>
            <ul>
              {result.factors.map(([k, v]) => (
                <li key={k}><span>{k}</span><b>{v}</b></li>
              ))}
            </ul>
            <p className="small muted">Abejokite, kai patikimumas žemas, daiktas retas, vintažinis ar prabangus, arba turi defektų, kurių DI nemato. Asmeniniai jūsų duomenys nenaudojami.</p>
          </div>
        )}
      </div>

      <aside className="comparables">
        <div>
          <h3>Panašios parduotos prekės {showAI && <small>({comps.length})</small>}</h3>
          <button onClick={() => setHowOpen(true)}>Kaip atrinkta?</button>
        </div>
        {!showAI ? (
          <p className="comparison-note"><Icon name="info" size={16} /> {store.aiAvailable ? "Palyginamos prekės bus parodytos, kai DI baigs paiešką." : "Be DI palyginamų prekių paieška neveikia."}</p>
        ) : (
          <>
            {comps.length === 0 && <p className="comparison-note"><Icon name="info" size={16} /> Šios kategorijos parduotų prekių nerasta — rodomas orientacinis intervalas.</p>}
            {comps.slice(0, showAll ? comps.length : 5).map((c) => (
              <div className="comparable" key={c.id}>
                <img src={c.image} alt="" />
                <div>
                  <strong>{c.title}</strong>
                  <span>Parduota prieš {c.days} d. · {c.condition.toLowerCase()}</span>
                  <button className="not-same" onClick={() => remove(c.id)}><Icon name="close" size={11} /> Ne tas pats</button>
                </div>
                <b>{c.price} €</b>
              </div>
            ))}
            {comps.length > 5 && <button className="text-btn show-all" onClick={() => setShowAll((x) => !x)}>{showAll ? "Rodyti mažiau" : `Rodyti visas (${comps.length})`}</button>}
            {draft.removedComps.length > 0 && (
              <p className="comparison-note">
                <Icon name="info" size={16} /> Pašalinote {draft.removedComps.length}.{" "}
                <button className="link" onClick={() => update((d) => ({ ...d, removedComps: [] }))}>Grąžinti visas</button>
              </p>
            )}
            <p className="comparison-note"><Icon name="info" size={16} /> Prekė nepanaši? Spauskite „Ne tas pats“ — intervalas bus perskaičiuotas be jos.</p>
          </>
        )}
        <button className="primary wide" onClick={proceed} disabled={!price || !!ownError}>
          {price ? <>Naudoti {price.value} € <Icon name="arrow" size={18} /></> : "Pasirinkite kainą"}
        </button>
        {price && <p className="price-source">{price.source === "strategy" ? `✦ Pasirinkta iš DI pasiūlymo („${price.strategy}“)` : "✎ Jūsų kaina"}</p>}
      </aside>

      <Modal open={howOpen} onClose={() => setHowOpen(false)} label="Kaip atrinktos prekės">
        <div className="compare">
          <h2>Kaip atrinktos palyginamos prekės?</h2>
          <ul className="plain">
            <li>Tik <b>parduotos</b> prekės (ne prašomos kainos) per 90 d., jei jų mažai — per 180 d.</li>
            <li>Tas pats tipas ir ženklas, panaši būklė; panašumas pagal nuotraukų vaizdą.</li>
            <li>Kai rasta mažiau nei 8 — rodomas orientacinis taisyklės intervalas ir žemas patikimumas.</li>
            <li>Jūsų asmeniniai duomenys nenaudojami. Pirkėjas mato tik galutinę kainą.</li>
          </ul>
        </div>
      </Modal>
    </section>
  )
}
