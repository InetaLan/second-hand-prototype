// Prototype data: catalog, sold comparables and simulated AI recognition results.

export const img = (id: string, extra = "") =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=700&q=80${extra}`

export const wardrobe = img("1441984904996-e0b6ba687e04", "&w=1200")

export const CATEGORIES = [
  "Megztiniai",
  "Džemperiai",
  "Palaidinės",
  "Marškinėliai",
  "Marškiniai",
  "Džinsai",
  "Kelnės",
  "Suknelės",
  "Striukės",
  "Paltai",
  "Kostiumai",
  "Kepurės",
  "Rinkiniai",
]
export const COLORS = [
  "Juoda",
  "Balta",
  "Pilka",
  "Mėlyna",
  "Raudona",
  "Ruda",
  "Smėlio",
  "Žalia",
  "Oranžinė",
  "Įvairių spalvų",
]
export const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Vaikiškas (98–116)"]
export const CONDITIONS = [
  "Nauja su etiketėmis",
  "Nauja be etikečių",
  "Labai gera",
  "Gera",
  "Patenkinama",
]
export const BRANDS = [
  "Champion",
  "Zara",
  "Massimo Dutti",
  "HM",
  "COS",
  "ARKET",
  "Mango",
  "Levis",
  "American Eagle",
  "Wrangler",
  "Nike",
  "Kappa",
  "Fila",
  "Gucci",
  "Kita be ženklo",
]
export const NO_BRAND = "Kita be ženklo"
export const LUXURY = ["Gucci", "Chanel", "Prada", "Louis Vuitton", "Dior", "Hermès"]

export type Product = {
  id: string
  title: string
  brand: string
  category: string
  color: string
  size: string
  price: number
  condition: string
  composition: string | null
  style: string[]
  image: string
  seller: string
  rating: number
  description: string
  lang?: "en"
  original?: string
  sponsored?: boolean
  aiAssisted?: boolean
  mine?: boolean
  status?: "active" | "moderation"
  moderationUntil?: number
}

const p = (x: Omit<Product, "seller" | "rating" | "condition"> & Partial<Product>): Product => ({
  seller: "Greta",
  rating: 4.8,
  condition: "Labai gera",
  ...x,
})

export const CATALOG: Product[] = [
  p({ id: "c1", title: "Tamsus megztas megztinis", brand: "COS", category: "Megztiniai", color: "Juoda", size: "M", price: 18, composition: "100 % vilna", style: ["minimalistinis", "klasikinis", "megztas"], image: img("1548768041-2fceab4c0b85"), seller: "Laura", rating: 4.9, description: "Šiltas, minimalistinio kirpimo megztinis. Dėvėtas vieną sezoną, be defektų.", aiAssisted: true }),
  p({ id: "c2", title: "Juodas džemperis", brand: "Champion", category: "Džemperiai", color: "Juoda", size: "M", price: 14, composition: "80 % medvilnė, 20 % poliesteris", style: ["sportinis", "minimalistinis"], image: img("1606051600761-3753de5474e6"), seller: "Tomas", rating: 4.7, description: "Klasikinis džemperis apvalia apykakle. Nedidelis nusidėvėjimas ant rankogalių." }),
  p({ id: "c3", title: "Juodas golfas", brand: "ARKET", category: "Megztiniai", color: "Juoda", size: "M", price: 19, composition: null, style: ["minimalistinis", "klasikinis"], image: img("1635447272615-a414b7ea1df4"), seller: "Emma", rating: 4.6, lang: "en", description: "Juodas golfas, minkštas ir tamprus. Tinka po švarku. Dėvėtas kelis kartus.", original: "Black turtleneck, soft and stretchy. Great under a blazer. Worn a few times." }),
  p({ id: "c4", title: "Merino vilnos megztinis", brand: "Massimo Dutti", category: "Megztiniai", color: "Juoda", size: "M", price: 22, composition: "100 % merino vilna", style: ["minimalistinis", "klasikinis", "megztas"], image: img("1548768041-2fceab4c0b85", "&crop=top"), seller: "Ugnė", rating: 5, description: "Plonas merino vilnos megztinis, labai geros būklės." }),
  p({ id: "c5", title: "Juodi marškinėliai su siuvinėjimu", brand: "HM", category: "Marškinėliai", color: "Juoda", size: "M", price: 8, composition: "100 % medvilnė", style: ["gatvės"], image: img("1589884047253-28d52f2891e7"), description: "Marškinėliai su rankų darbo siuvinėjimu." }),
  p({ id: "c6", title: "Klasikiniai medvilnės marškinėliai", brand: "Mango", category: "Marškinėliai", color: "Juoda", size: "M", price: 12, composition: "100 % medvilnė", style: ["minimalistinis"], image: img("1759572095317-3a96f9a98e2b"), description: "Du vienspalviai marškinėliai, parduodami kartu." }),
  p({ id: "c7", title: "Smėlio spalvos megztinis", brand: "Zara", category: "Megztiniai", color: "Smėlio", size: "M", price: 16, composition: "60 % medvilnė, 40 % akrilas", style: ["megztas", "jaukus"], image: img("1631541909061-71e349d1f203"), description: "Stambaus mezgimo, jaukus megztinis." }),
  p({ id: "c8", title: "Rudas megztas megztinis", brand: "Pull&Bear", category: "Megztiniai", color: "Ruda", size: "M", price: 15, composition: null, style: ["megztas", "jaukus"], image: img("1614676471928-2ed0ad1061a4"), description: "Rudas megztinis, dėvėtas vieną žiemą." }),
  p({ id: "c9", title: "Oranžinis megztinis", brand: "Weekday", category: "Megztiniai", color: "Oranžinė", size: "M", price: 17, composition: "100 % medvilnė", style: ["ryškus", "laisvas"], image: img("1578587018452-892bacefd3f2"), sponsored: true, description: "Ryškus laisvo kirpimo megztinis." }),
  p({ id: "c10", title: "Baltas džemperis", brand: "Nike", category: "Džemperiai", color: "Balta", size: "L", price: 20, composition: "80 % medvilnė, 20 % poliesteris", style: ["sportinis", "minimalistinis"], image: img("1620799140408-edc6dcb6d633"), description: "Baltas džemperis, išskalbtas, be dėmių." }),
  p({ id: "c11", title: "Juodi marškinėliai", brand: "Weekday", category: "Marškinėliai", color: "Juoda", size: "S", price: 9, composition: "100 % medvilnė", style: ["minimalistinis"], image: img("1583743814966-8936f5b7be1a"), description: "Juodi marškinėliai su nedideliu užrašu." }),
  p({ id: "c12", title: "Juodi marškinėliai su logotipu", brand: "Levis", category: "Marškinėliai", color: "Juoda", size: "M", price: 10, composition: "100 % medvilnė", style: ["gatvės"], image: img("1618354691373-d851c5c3a990"), description: "Marškinėliai su mažu logotipu ant krūtinės." }),
  p({ id: "c13", title: "Smėlio marškinėliai su raštu", brand: "Obey", category: "Marškinėliai", color: "Smėlio", size: "L", price: 11, composition: "100 % medvilnė", style: ["gatvės", "ryškus"], image: img("1576566588028-4147f3842f27"), lang: "en", description: "Marškinėliai su ryškiu spaudiniu, dėvėti kelis kartus.", original: "Graphic tee with bold print, worn a couple of times." }),
  p({ id: "c14", title: "Megztas pončas", brand: "Mango", category: "Megztiniai", color: "Balta", size: "S", price: 21, composition: "100 % medvilnė", style: ["boho", "megztas"], image: img("1434389677669-e08b4cac3105"), description: "Kreminės spalvos pončas su kutais." }),
  p({ id: "c15", title: "Rudas bomberis", brand: "Zara", category: "Striukės", color: "Ruda", size: "M", price: 25, composition: "100 % poliesteris", style: ["klasikinis"], image: img("1591047139829-d91aecb6caea"), description: "Lengva pavasarinė striukė." }),
  p({ id: "c16", title: "Juoda odinė striukė", brand: "AllSaints", category: "Striukės", color: "Juoda", size: "M", price: 65, composition: "100 % oda", style: ["roko", "klasikinis"], image: img("1551028719-00167b16eac5"), description: "Natūralios odos striukė, gerai prižiūrėta." }),
  p({ id: "c17", title: "Smėlio paltas su diržu", brand: "Massimo Dutti", category: "Paltai", color: "Smėlio", size: "S", price: 55, composition: "70 % vilna, 30 % poliamidas", style: ["klasikinis", "elegantiškas"], image: img("1539533018447-63fcce2678e3"), description: "Klasikinis paltas su diržu." }),
  p({ id: "c18", title: "Avikailio striukė", brand: "Mango", category: "Striukės", color: "Ruda", size: "M", price: 48, composition: null, style: ["vintažinis"], image: img("1608063615781-e2ef8c73d114"), description: "Šilta striukė su dirbtinio avikailio pamušalu." }),
  p({ id: "c19", title: "Raudona ilga suknelė", brand: "Reserved", category: "Suknelės", color: "Raudona", size: "S", price: 30, composition: "100 % poliesteris", style: ["elegantiškas"], image: img("1595777457583-95e059d581b8"), description: "Ilga, plevenanti suknelė progai." }),
  p({ id: "c20", title: "Raudona gėlėta suknelė", brand: "HM", category: "Suknelės", color: "Raudona", size: "M", price: 18, composition: "100 % viskozė", style: ["vintažinis", "ryškus"], image: img("1572804013309-59a88b7e92f1"), description: "Gėlėto rašto suknelė su diržu." }),
  p({ id: "c21", title: "Šviesūs džinsai", brand: "Levis", category: "Džinsai", color: "Mėlyna", size: "M", price: 22, composition: "99 % medvilnė, 1 % elastanas", style: ["klasikinis"], image: img("1542272604-787c3835535d"), description: "Klasikiniai tiesaus kirpimo džinsai." }),
  p({ id: "c22", title: "Tamsūs tiesūs džinsai", brand: "Lee", category: "Džinsai", color: "Mėlyna", size: "L", price: 16, composition: "100 % medvilnė", style: ["klasikinis"], image: img("1624378439575-d8705ad7ae80"), description: "Tamsūs džinsai, beveik nedėvėti." }),
  p({ id: "c23", title: "Žydri marškiniai", brand: "Tommy Hilfiger", category: "Marškiniai", color: "Mėlyna", size: "M", price: 19, composition: "100 % medvilnė", style: ["klasikinis", "elegantiškas"], image: img("1620012253295-c15cc3e65df4"), lang: "en", description: "Lygintini marškiniai, tinka į biurą.", original: "Crisp office shirt, slim fit." }),
  p({ id: "c24", title: "Juodas moteriškas kostiumas", brand: "Zara", category: "Kostiumai", color: "Juoda", size: "S", price: 40, composition: "65 % poliesteris, 35 % viskozė", style: ["elegantiškas", "minimalistinis"], image: img("1584273143981-41c073dfe8f8"), description: "Švarkas ir kelnės, komplektas." }),
  p({ id: "c25", title: "Vaikiškas megztinis", brand: "Next", category: "Megztiniai", color: "Mėlyna", size: "Vaikiškas (98–116)", price: 9, composition: "100 % medvilnė", style: ["klasikinis"], image: img("1519238263530-99bdd11df2ea"), description: "Vaikiškas megztinis su sagomis, 110 cm." }),
  p({ id: "c26", title: "Balti marškinėliai", brand: "COS", category: "Marškinėliai", color: "Balta", size: "M", price: 10, composition: "100 % medvilnė", style: ["minimalistinis"], image: img("1521572163474-6864f9cf17ab"), description: "Stori balti marškinėliai." }),
  p({ id: "c27", title: "Juodi marškinėliai su spaudiniu", brand: "Bershka", category: "Marškinėliai", color: "Juoda", size: "S", price: 7, composition: null, style: ["gatvės"], image: img("1503342217505-b0a15ec3261c"), lang: "en", description: "Trumpi marškinėliai su spaudiniu.", original: "Cropped tee with print." }),
  p({ id: "c28", title: "Plonas juodas megztinis", brand: "Uniqlo", category: "Megztiniai", color: "Juoda", size: "S", price: 12, composition: "100 % merino vilna", style: ["minimalistinis", "klasikinis"], image: img("1635447272615-a414b7ea1df4", "&crop=bottom"), description: "Plonas merino megztinis." }),
]

// Sold comparables used by F2 "Kiek prašyti?" (džemperių kainos parinktos taip, kad Q25–Q75 ≈ 12–18 €)
export type Comparable = { id: string; title: string; category: string; price: number; days: number; image: string; condition: string }
const compImages: Record<string, string[]> = {
  Džemperiai: [
    "1606051600761-3753de5474e6",
    "1548768041-2fceab4c0b85",
    "1635447272615-a414b7ea1df4",
    "1620799140408-edc6dcb6d633",
    "1631541909061-71e349d1f203",
    "1614676471928-2ed0ad1061a4",
    "1589884047253-28d52f2891e7",
  ],
  Džinsai: ["1542272604-787c3835535d", "1624378439575-d8705ad7ae80"],
  Rinkiniai: ["1525507119028-ed4c629a60a3", "1556905055-8f358a7a47b2", "1614676471928-2ed0ad1061a4"],
}
const comps = (category: string, prefix: string, rows: [string, number, number][]): Comparable[] =>
  rows.map(([title, price, days], i) => ({
    id: `${prefix}${i}`,
    title,
    category,
    price,
    days,
    image: img(compImages[category][i % compImages[category].length], "&w=200"),
    condition: i % 3 ? "Labai gera" : "Gera",
  }))
export const COMPARABLES: Comparable[] = [
  ...comps("Džemperiai", "s", [
    ["Juodas džemperis Champion", 16, 4],
    ["Džemperis apvalia apykakle", 14, 12],
    ["Champion džemperis su logotipu", 18, 21],
    ["Juodas medvilnės džemperis", 15, 6],
    ["Sportinis džemperis", 12, 3],
    ["Tamsiai pilkas džemperis", 13, 9],
    ["Juodas džemperis M", 15, 15],
    ["Džemperis oversized", 17, 26],
    ["Champion Reverse Weave", 22, 40],
    ["Juodas basic džemperis", 11, 2],
    ["Klasikinis džemperis", 12, 5],
    ["Džemperis be gobtuvo", 18, 33],
    ["Juodas džemperis L", 10, 2],
    ["Champion vintažinis", 20, 28],
  ]),
  ...comps("Džinsai", "j", [
    ["Šviesūs American Eagle džinsai", 18, 5],
    ["Levis 501 džinsai", 24, 9],
    ["Wrangler tiesūs džinsai", 16, 7],
    ["Aukštu liemeniu džinsai", 15, 4],
    ["Šviesūs skinny džinsai", 12, 3],
    ["Mom fit džinsai", 20, 11],
    ["Džinsai su nubrozdinimais", 17, 14],
    ["Tamsūs tiesūs džinsai", 14, 6],
    ["Levis vintažiniai džinsai", 28, 30],
    ["Platėjantys džinsai", 19, 12],
  ]),
  ...comps("Rinkiniai", "r", [
    ["Rudens drabužių rinkinys", 25, 8],
    ["Megztinis ir džinsai", 22, 6],
    ["Trijų daiktų rinkinys", 30, 15],
    ["Vaikiškų drabužių rinkinys", 18, 4],
    ["Laisvalaikio rinkinys", 20, 9],
    ["Kepurė ir megztinis", 16, 5],
    ["Žieminis rinkinys", 35, 21],
    ["Džinsų ir marškinėlių rinkinys", 19, 7],
    ["Drabužių paketas M dydžio", 28, 12],
  ]),
]

// F2 taisyklės (V1) bazinė kaina pagal kategoriją, €
export const CATEGORY_BASE_PRICE: Record<string, number> = {
  Megztiniai: 15,
  Džemperiai: 14,
  Palaidinės: 10,
  Marškinėliai: 8,
  Marškiniai: 12,
  Džinsai: 18,
  Kelnės: 14,
  Suknelės: 18,
  Striukės: 30,
  Paltai: 40,
  Kostiumai: 35,
  Kepurės: 7,
  Rinkiniai: 24,
}

// Demo photos for testing scenarios
export type DemoKind = "sweater" | "label" | "multi" | "dark"
export const DEMO_PHOTOS: Record<DemoKind, string> = {
  sweater: "/demo/sweater.jpg",
  label: "/demo/label.svg",
  multi: "/demo/multi.jpg",
  dark: "/demo/dark.jpg",
}

export type Box = { x: number; y: number; w: number; h: number }
export type Detected = { id: string; label: string; box: Box }

// A1: several items detected in one frame
export const MULTI_ITEMS: Detected[] = [
  { id: "beanie", label: "Oranžinė kepurė", box: { x: 0, y: 8, w: 47, h: 44 } },
  { id: "sweater", label: "Pilkas megztinis", box: { x: 0, y: 27, w: 68, h: 59 } },
  { id: "jeans", label: "Šviesūs džinsai", box: { x: 44, y: 18, w: 56, h: 77 } },
]

export type Suggestion = {
  value?: string
  conf: number
  variants?: string[]
  why: string
  box?: Box
  photo?: number
  snippet?: string
}
export type Recognition = Partial<Record<"category" | "brand" | "color" | "composition" | "size", Suggestion>>

export const RECOGNITION: Record<string, Recognition> = {
  sweater: {
    category: { value: "Džemperiai", conf: 0.95, why: "Forma: apvali apykaklė, platūs rankogaliai", box: { x: 3, y: 2, w: 94, h: 94 } },
    color: { value: "Juoda", conf: 0.97, why: "Vyraujanti spalva daikto srityje", box: { x: 15, y: 20, w: 70, h: 60 } },
    brand: { conf: 0.74, variants: ["Champion", "Kappa", "Fila"], why: "Logotipas ant krūtinės matomas tik iš dalies", box: { x: 66, y: 44, w: 20, h: 12 } },
    composition: { conf: 0.4, why: "Etiketės nuotraukos nėra — sudėties nematyti" },
  },
  sweaterLabel: {
    category: { value: "Džemperiai", conf: 0.95, why: "Forma: apvali apykaklė, platūs rankogaliai", box: { x: 3, y: 2, w: 94, h: 94 } },
    color: { value: "Juoda", conf: 0.97, why: "Vyraujanti spalva daikto srityje", box: { x: 15, y: 20, w: 70, h: 60 } },
    brand: { conf: 0.82, variants: ["Champion", "Zara", "Massimo Dutti"], why: "Etiketėje ženklas iš dalies išblukęs", photo: 1, snippet: "„Ch···ion“", box: { x: 25, y: 10, w: 50, h: 14 } },
    composition: { value: "80 % medvilnė, 20 % poliesteris", conf: 0.93, why: "Nuskaityta iš etiketės", photo: 1, snippet: "„80% COTTON, 20% POLYESTER“", box: { x: 25, y: 33, w: 50, h: 18 } },
    size: { conf: 0.3, why: "Dydžio vieta etiketėje neįskaitoma", photo: 1, box: { x: 38, y: 70, w: 24, h: 11 } },
  },
  beanie: {
    category: { value: "Kepurės", conf: 0.92, why: "Megzta kepurė su atlenkimu", box: MULTI_ITEMS[0].box },
    color: { conf: 0.72, variants: ["Oranžinė", "Ruda", "Raudona"], why: "Šilta spalva tarp oranžinės ir rudos", box: MULTI_ITEMS[0].box },
    brand: { conf: 0.35, why: "Odinė etiketė be įskaitomo užrašo", box: { x: 36, y: 22, w: 8, h: 6 } },
    composition: { conf: 0.3, why: "Etiketės nuotraukos nėra" },
  },
  jeans: {
    category: { value: "Džinsai", conf: 0.96, why: "Penkių kišenių džinsinis audinys", box: MULTI_ITEMS[2].box },
    color: { value: "Mėlyna", conf: 0.94, why: "Šviesiai mėlynas džinsas", box: MULTI_ITEMS[2].box },
    brand: { conf: 0.8, variants: ["American Eagle", "Levis", "Wrangler"], why: "Odinė etiketė ant juosmens", snippet: "„AMERICAN EAGLE“", box: { x: 65, y: 20, w: 12, h: 7 } },
    composition: { conf: 0.3, why: "Etiketės nuotraukos nėra" },
  },
  multiSweater: {
    category: { value: "Megztiniai", conf: 0.93, why: "Stambaus rašto mezgimas, platūs rankogaliai", box: MULTI_ITEMS[1].box },
    color: { value: "Pilka", conf: 0.95, why: "Vyraujanti spalva daikto srityje", box: MULTI_ITEMS[1].box },
    brand: { conf: 0.3, why: "Etiketės ar logotipo nematyti" },
    composition: { conf: 0.3, why: "Etiketės nuotraukos nėra" },
  },
  set: {
    category: { conf: 0.62, variants: ["Rinkiniai", "Megztiniai", "Džinsai"], why: "Kadre keli skirtingi daiktai" },
    color: { value: "Įvairių spalvų", conf: 0.9, why: "Kadre kelios skirtingos spalvos" },
    brand: { conf: 0.3, why: "Skirtingi daiktai — ženklo nustatyti negalima" },
    composition: { conf: 0.2, why: "Etiketės nuotraukos nėra" },
  },
}
