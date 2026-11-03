// Simulated AI + rule-based helpers. Quality checks and colour detection run on the
// real image pixels; recognition, pricing and search ranking follow the rules in ND2.
import { COMPARABLES, Comparable, Recognition, RECOGNITION, Suggestion } from "./data"

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/* ---------- E1: photo quality check (no AI) ---------- */
export type Quality = { ok: boolean; issues: string[]; brightness: number; color?: string; colors?: string[] }

export async function inspectPhoto(src: string): Promise<{ src: string; quality: Quality }> {
  const image = await loadImage(src)
  const max = 900
  const scale = Math.min(1, max / Math.max(image.naturalWidth || max, image.naturalHeight || max))
  const w = Math.max(1, Math.round((image.naturalWidth || max) * scale))
  const h = Math.max(1, Math.round((image.naturalHeight || max) * scale))
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(image, 0, 0, w, h)
  let data: Uint8ClampedArray
  try {
    data = ctx.getImageData(0, 0, w, h).data
  } catch {
    return { src, quality: { ok: true, issues: [], brightness: 128 } }
  }
  let sum = 0
  let edges = 0
  const hist = new Array(256).fill(0)
  const lum = (i: number) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  const step = 4 * 3
  for (let i = 0; i < data.length - step; i += step) {
    const l = lum(i)
    sum += l
    hist[Math.min(255, Math.round(l))]++
    edges += Math.abs(l - lum(i + step))
  }
  const n = data.length / step
  const brightness = sum / n
  const sharpness = edges / n
  // Dark garments are fine; the scene is too dark when even its brightest 10 % is dim
  let acc = 0
  let p90 = 255
  for (let v = 0; v < 256; v++) {
    acc += hist[v]
    if (acc >= n * 0.9) { p90 = v; break }
  }
  const issues: string[] = []
  if (p90 < 70) issues.push("Per tamsu — fotografuokite prie lango arba įjunkite šviesą.")
  if (Math.max(image.naturalWidth, image.naturalHeight) < 500) issues.push("Per maža raiška — naudokite didesnę nuotrauką.")
  else if (sharpness < 2.2) issues.push("Nuotrauka neryški — laikykite telefoną stabiliai.")
  const persisted = src.startsWith("/") ? src : canvas.toDataURL("image/jpeg", 0.78)
  return { src: persisted, quality: { ok: issues.length === 0, issues, brightness, color: dominantColor(data, w, h)[0], colors: dominantColor(data, w, h) } }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.crossOrigin = "anonymous"
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = src
  })
}

function dominantColor(d: Uint8ClampedArray, w: number, h: number) {
  // Average of the central box (where the item usually is), mapped to the closest palette colour
  let r = 0, g = 0, b = 0, n = 0
  for (let y = Math.floor(h * 0.35); y < h * 0.65; y += 3)
    for (let x = Math.floor(w * 0.35); x < w * 0.65; x += 3) {
      const k = (y * w + x) * 4
      r += d[k]; g += d[k + 1]; b += d[k + 2]; n++
    }
  r /= n; g /= n; b /= n
  const palette: [string, number[]][] = [
    ["Juoda", [30, 30, 32]], ["Balta", [235, 235, 230]], ["Pilka", [140, 140, 140]], ["Mėlyna", [60, 90, 160]],
    ["Raudona", [190, 40, 40]], ["Ruda", [120, 75, 45]], ["Smėlio", [205, 185, 150]], ["Žalia", [60, 130, 70]], ["Oranžinė", [225, 120, 40]],
  ]
  return palette
    .map(([name, [pr, pg, pb]]) => [name, (pr - r) ** 2 + (pg - g) ** 2 + (pb - b) ** 2] as const)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([name]) => name)
}

/* ---------- F1: recognition ---------- */
export function recognitionFor(key: string, uploadColors?: string[], hasLabel = false): Recognition {
  if (RECOGNITION[key]) return RECOGNITION[key]
  // Own uploads: colour is measured from the photo, the rest stays uncertain (prototype)
  const rec: Recognition = {
    category: { conf: 0.7, variants: ["Megztiniai", "Džemperiai", "Palaidinės"], why: "Prototipe tipas spėjamas pagal formą — patikrinkite" },
    color: { conf: 0.72, variants: uploadColors?.length ? uploadColors : ["Juoda", "Pilka", "Mėlyna"], why: "Spalva išmatuota nuotraukos centre — apšvietimas gali ją iškraipyti", box: { x: 35, y: 35, w: 30, h: 30 } },
    brand: { conf: 0.4, why: "Ženklo nepavyko atpažinti" },
    composition: hasLabel
      ? { conf: 0.66, variants: ["100 % medvilnė", "80 % medvilnė, 20 % poliesteris", "100 % poliesteris"], why: "Etiketės tekstas įskaitomas iš dalies", photo: 1 }
      : { conf: 0.3, why: "Etiketės nuotraukos nėra — sudėties nematyti" },
  }
  return rec
}

export const confWord = (c: number) => (c >= 0.9 ? "aukštas" : c >= 0.6 ? "vidutinis" : "žemas")
export const isConfident = (s?: Suggestion) => !!s && s.conf >= 0.9 && !!s.value

/* ---------- Lithuanian text generation from confirmed fields ---------- */
const CAT: Record<string, [string, "m" | "f" | "mp" | "fp"]> = {
  Megztiniai: ["megztinis", "m"], Džemperiai: ["džemperis", "m"], Palaidinės: ["palaidinė", "f"], Marškinėliai: ["marškinėliai", "mp"],
  Marškiniai: ["marškiniai", "mp"], Džinsai: ["džinsai", "mp"], Kelnės: ["kelnės", "fp"], Suknelės: ["suknelė", "f"], Striukės: ["striukė", "f"],
  Paltai: ["paltas", "m"], Kostiumai: ["kostiumas", "m"], Kepurės: ["kepurė", "f"], Rinkiniai: ["drabužių rinkinys", "m"],
}
const ADJ: Record<string, string[]> = {
  Juoda: ["juodas", "juoda", "juodi", "juodos"], Balta: ["baltas", "balta", "balti", "baltos"], Pilka: ["pilkas", "pilka", "pilki", "pilkos"],
  Mėlyna: ["mėlynas", "mėlyna", "mėlyni", "mėlynos"], Raudona: ["raudonas", "raudona", "raudoni", "raudonos"], Ruda: ["rudas", "ruda", "rudi", "rudos"],
  Žalia: ["žalias", "žalia", "žali", "žalios"], Oranžinė: ["oranžinis", "oranžinė", "oranžiniai", "oranžinės"],
}
export function itemName(category: string, color: string) {
  const [noun, g] = CAT[category] || [category.toLowerCase(), "m"]
  if (!color) return noun
  if (color === "Smėlio") return `smėlio spalvos ${noun}`
  if (color === "Įvairių spalvų") return `įvairių spalvų ${noun}`
  const forms = ADJ[color]
  if (!forms) return noun
  return `${forms[{ m: 0, f: 1, mp: 2, fp: 3 }[g]]} ${noun}`
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export type Facts = { category: string; color: string; brand: string; size: string; condition: string; defects: string; composition: string }

export function makeTitle(f: Facts, variant = 0) {
  const name = itemName(f.category, f.color)
  const brand = f.brand && !f.brand.startsWith("Kita") ? f.brand : ""
  const options = [
    [brand, name].filter(Boolean).join(" "),
    [cap(name), brand && `· ${brand}`].filter(Boolean).join(" "),
    [cap(name), f.size && `, ${f.size} dydis`].filter(Boolean).join(""),
  ]
  const t = cap(options[variant % options.length] || name)
  return (f.size && variant % 3 === 0 ? `${t}, ${f.size}` : t).slice(0, 60)
}

export type Tone = "paprastas" | "dalykiškas" | "žaismingas"
export function makeDescription(f: Facts, tone: Tone, variant = 0) {
  const name = itemName(f.category, f.color)
  const brand = f.brand && !f.brand.startsWith("Kita") ? f.brand : ""
  const noDefects = /^be defekt/i.test(f.defects.trim())
  const defects = !f.defects ? "" : noDefects ? "Defektų nepastebėjau." : `Atkreipkite dėmesį: ${f.defects.replace(/\.$/, "")}.`
  const cond = f.condition ? f.condition.toLowerCase() : ""
  const parts: string[] = []
  if (tone === "paprastas") {
    parts.push(variant % 2 ? `Parduodu: ${name}${brand ? ` (${brand})` : ""}.` : `Parduodu: ${brand ? brand + " " : ""}${name}.`)
    if (f.size) parts.push(`Dydis – ${f.size}.`)
    if (cond) parts.push(`Būklė ${cond}.`)
    if (defects) parts.push(defects)
    if (f.composition) parts.push(`Sudėtis: ${f.composition}.`)
    parts.push(variant % 2 ? "Jei reikia matmenų – parašykite, išmatuosiu." : "Klauskite, mielai atsakysiu!")
  } else if (tone === "dalykiškas") {
    parts.push(`${cap(name)}${brand ? `, ženklas ${brand}` : ""}.`)
    if (f.size) parts.push(`Dydis: ${f.size}.`)
    if (cond) parts.push(`Būklė: ${cond}.`)
    if (defects) parts.push(defects.replace("nepastebėjau", "nepastebėta"))
    if (f.composition) parts.push(`Sudėtis pagal etiketę: ${f.composition}.`)
    parts.push("Daugiau informacijos – žinute.")
  } else {
    parts.push(`${cap(name)}${brand ? ` iš ${brand}` : ""} ieško naujų namų! ✨`)
    if (f.size) parts.push(`Tiks, jei dėvite ${f.size}.`)
    if (cond) parts.push(`Būklė – ${cond}.`)
    if (defects) parts.push(defects)
    if (f.composition) parts.push(`Sudėtis: ${f.composition}.`)
    parts.push("Paspauskite ♡ ir jis jūsų!")
  }
  return parts.join(" ")
}

/* ---------- F2: price range ---------- */
export function quantile(sorted: number[], q: number) {
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}
const CONDITION_ADJ: Record<string, number> = { "Nauja su etiketėmis": 0.2, "Nauja be etikečių": 0.12, "Labai gera": 0.04, Gera: -0.1, Patenkinama: -0.3 }

export function ruleRange(condition: string) {
  // V1 rule: same brand + category sold median adjusted by condition
  const base = 14 * (1 + (CONDITION_ADJ[condition] ?? 0))
  return { low: Math.round(base * 0.75), high: Math.round(base * 1.15) }
}

export type PriceResult = {
  count: number
  low: number
  mid: number
  high: number
  confidence: "aukštas" | "vidutinis" | "žemas"
  factors: [string, string][]
  fallback: boolean
}
export function aiRange(comps: Comparable[], f: Facts): PriceResult {
  const prices = comps.map((c) => c.price).sort((a, b) => a - b)
  const adj = 1 + (CONDITION_ADJ[f.condition] ?? 0) - 0.04
  const factors: [string, string][] = []
  if (f.brand && !f.brand.startsWith("Kita")) factors.push([`Prekės ženklas ${f.brand}`, "+10 %"])
  if (f.condition) factors.push([`Būklė „${f.condition.toLowerCase()}“`, `${CONDITION_ADJ[f.condition] >= 0 ? "+" : "−"}${Math.abs(Math.round((CONDITION_ADJ[f.condition] ?? 0) * 100))} %`])
  factors.push(["Rudens sezonas (džemperių paklausa)", "+2 %"])
  if (prices.length < 8) {
    const r = ruleRange(f.condition)
    return { count: prices.length, low: r.low, mid: Math.round((r.low + r.high) / 2), high: r.high, confidence: "žemas", factors, fallback: true }
  }
  const low = Math.round(quantile(prices, 0.25) * adj)
  const mid = Math.round(quantile(prices, 0.5) * adj)
  const high = Math.round(quantile(prices, 0.75) * adj)
  const spread = (high - low) / mid
  const confidence = prices.length >= 12 && spread < 0.6 ? "aukštas" : "vidutinis"
  return { count: prices.length, low, mid, high, confidence, factors, fallback: false }
}
export const defaultComps = () => COMPARABLES
