import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react"
import type { Box, Product } from "./data"
import type { Quality, Tone } from "./ai"

export type View = "home" | "sell" | "listings" | "about"
export type Persona = "ruta" | "mantas"

export type FieldKey = "title" | "category" | "brand" | "color" | "composition" | "size" | "condition" | "defects" | "description"
export type Field = {
  value: string
  source: "ai" | "user" | "empty"
  conf?: number
  aiValue?: string
  variants?: string[]
  why?: string
  box?: Box
  photo?: number
  snippet?: string
  aiOffered?: boolean
}
export type Photo = { src: string; isLabel: boolean; quality?: Quality; demo?: string }
export type Draft = {
  id: string
  step: "photos" | "details" | "price" | "preview"
  photos: Photo[]
  fields: Record<FieldKey, Field>
  tone: Tone
  mode: "ai" | "manual" | "pending"
  item?: string
  price?: { value: number; source: "strategy" | "own"; strategy?: string }
  removedComps: string[]
  aiFields?: Partial<Record<FieldKey, Field>>
  fresh?: boolean
  lowQuality?: boolean
  updatedAt: number
}
export type Demo = { slowAI: boolean; offline: boolean }

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function save(key: string, value: unknown) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

type Toast = { id: number; text: string; action?: { label: string; run: () => void } }
type Ctx = {
  view: View
  go: (v: View) => void
  persona: Persona
  setPersona: (p: Persona) => void
  listings: Product[]
  setListings: (fn: (l: Product[]) => Product[]) => void
  saved: string[]
  toggleSaved: (id: string) => void
  draft: Draft | null
  setDraft: (d: Draft | null) => boolean
  demo: Demo
  setDemo: (d: Demo) => void
  aiAvailable: boolean
  consent: { seen: boolean; training: boolean }
  setConsent: (c: { seen: boolean; training: boolean }) => void
  toast: (text: string, action?: Toast["action"]) => void
  openProduct: (p: Product, reasons?: { why: string }) => void
  product: { p: Product; why?: string } | null
  closeProduct: () => void
}
const StoreCtx = createContext<Ctx | null>(null)
export const useStore = () => useContext(StoreCtx)!

export function StoreProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("home")
  const [persona, setPersonaState] = useState<Persona>(() => load("ak.persona", "ruta"))
  const [listings, setListingsState] = useState<Product[]>(() => load("ak.listings", []))
  const [saved, setSaved] = useState<string[]>(() => load("ak.saved", []))
  const [draft, setDraftState] = useState<Draft | null>(() => load("ak.draft", null))
  const [demo, setDemoState] = useState<Demo>(() => load("ak.demo", { slowAI: false, offline: false }))
  const [consent, setConsentState] = useState(() => load("ak.consent", { seen: false, training: false }))
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [product, setProduct] = useState<Ctx["product"]>(null)
  const nextId = useRef(1)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [])

  // Toast su veiksmu nedingsta, kol pelė virš jo ar jame fokusas; išėjus laikmatis (7 s) prasideda iš naujo
  const toastTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const toastHold = useRef(new Map<number, { hover: boolean; focus: boolean }>())
  const dismissLater = useCallback((id: number, ms: number) => {
    clearTimeout(toastTimers.current.get(id))
    toastTimers.current.set(
      id,
      setTimeout(() => {
        toastTimers.current.delete(id)
        toastHold.current.delete(id)
        setToasts((t) => t.filter((x) => x.id !== id))
      }, ms),
    )
  }, [])
  const holdToast = (id: number, change: Partial<{ hover: boolean; focus: boolean }>) => {
    const state = { hover: false, focus: false, ...toastHold.current.get(id), ...change }
    toastHold.current.set(id, state)
    if (state.hover || state.focus) clearTimeout(toastTimers.current.get(id))
    else dismissLater(id, 7000)
  }

  const toast = useCallback(
    (text: string, action?: Toast["action"]) => {
      const id = nextId.current++
      setToasts((t) => [...t, { id, text, action }])
      dismissLater(id, action ? 7000 : 4000)
    },
    [dismissLater],
  )

  const updateListings = (fn: (l: Product[]) => Product[]) =>
    setListingsState((l) => {
      const next = fn(l)
      save("ak.listings", next)
      return next
    })

  // Moderacijos imitacija: po moderationUntil skelbimas tampa aktyvus (veikia ir perkrovus puslapį)
  useEffect(() => {
    const pending = listings.filter((l) => l.status === "moderation" && l.moderationUntil)
    if (!pending.length) return
    const soonest = Math.min(...pending.map((l) => l.moderationUntil!))
    const t = setTimeout(() => {
      const due = pending.filter((l) => l.moderationUntil! <= Date.now())
      updateListings((ls) => ls.map((l) => (due.some((d) => d.id === l.id) ? { ...l, status: "active", moderationUntil: undefined } : l)))
      due.forEach((l) => toast(`Moderatorius patvirtino skelbimą „${l.title}“.`))
    }, Math.max(0, soonest - Date.now()))
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, toast])

  const ctx: Ctx = {
    view,
    go: (v) => {
      setProduct(null)
      setView(v)
    },
    persona,
    setPersona: (p) => {
      setPersonaState(p)
      save("ak.persona", p)
    },
    listings,
    setListings: updateListings,
    saved,
    toggleSaved: (id) =>
      setSaved((s) => {
        const next = s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
        save("ak.saved", next)
        return next
      }),
    draft,
    setDraft: (d) => {
      setDraftState(d)
      if (save("ak.draft", d)) return true
      // Storage full (large photos): keep the draft without photos
      if (d) save("ak.draft", { ...d, photos: [] })
      return false
    },
    demo,
    setDemo: (d) => {
      setDemoState(d)
      save("ak.demo", d)
    },
    aiAvailable: online && !demo.offline,
    consent,
    setConsent: (c) => {
      setConsentState(c)
      save("ak.consent", c)
    },
    toast,
    openProduct: (p, r) => setProduct({ p, why: r?.why }),
    product,
    closeProduct: () => setProduct(null),
  }
  return (
    <StoreCtx.Provider value={ctx}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div
            className="toast"
            key={t.id}
            onMouseEnter={t.action ? () => holdToast(t.id, { hover: true }) : undefined}
            onMouseLeave={t.action ? () => holdToast(t.id, { hover: false }) : undefined}
            onFocus={t.action ? () => holdToast(t.id, { focus: true }) : undefined}
            onBlur={t.action ? (e) => !e.currentTarget.contains(e.relatedTarget) && holdToast(t.id, { focus: false }) : undefined}
          >
            <span>{t.text}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.run()
                  clearTimeout(toastTimers.current.get(t.id))
                  setToasts((x) => x.filter((y) => y.id !== t.id))
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </StoreCtx.Provider>
  )
}
