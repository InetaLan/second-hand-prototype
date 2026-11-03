# Prototipo verifikacija pagal ND1 patikrinimo sąrašą

**Prototipas:** „Antras kartas“: pradinis puslapis + F1 „Skelbimas iš nuotraukų“ + F2 „Kiek prašyti?“ (3 narių komanda → 2 esminės DI funkcijos).
**Režimas:** augmentacija su HITL. DI tik siūlo, o kiekvieną lauką, kainą ir paskelbimą tvirtina pardavėjas.
**Skalė (kaip ND1):** 1 – nevykdoma, 3 – iš dalies, 5 – puikiai.

> Svarbu: skaičiavimo dalis yra „juoda dėžė“ (užduoties 11 p.). Atpažinimo, kainos ir teksto rezultatai imituojami pagal ND2 slenksčius ir taisykles. Nuotraukos kokybės patikra (šviesumas, raiška, ryškumas) ir spalvos matavimas veikia su tikrais nuotraukos pikseliais.

## 1. ND1 kriterijai (H1–H9, DI1–DI8)

| ID | Kriterijus | Kaip įgyvendinta prototipe | Kur pamatyti | Balas |
|---|---|---|---|---|
| H1 | Sistemos būsenos matomumas | Eigos juosta „Atpažįstu… 1/3–3/3“, žingsnių progresas, „Juodraštis išsaugotas automatiškai“. Kiekvienas laukas pažymėtas ✓ / ? / ✎ / ✦ / –. Rodoma suvestinė „DI pasiūlė 6 iš 9“. | Parduoti → Informacija | 5 |
| H2 | Atitikimas realiam pasauliui | Viskas lietuviškai. Kategorijos sutampa su įprasta taksonomija. Galima rinktis aprašymo toną (paprastas / dalykiškas / žaismingas), Mantui numatytas dalykiškas. | Aprašymo laukas | 4 (gramatika iš šablonų, ne iš kalbos modelio) |
| H3 | Vartotojo kontrolė ir laisvė | Kiekvieną DI lauką galima keisti, pergeneruoti ↻ arba grąžinti DI versiją. Yra „Pildyti be DI“ / „Grąžinti DI pasiūlymus“, žingsnis atgal be duomenų praradimo ir „Atšaukti“ 10 s po paskelbimo. | Informacija, Peržiūra, Paskelbta | 5 |
| H5 | Klaidų prevencija | Nuotraukos kokybės patikra prieš DI (E1). Klausimas „Kurį daiktą parduodate?“ (A1). „?“ su 3 variantais vietoj spėjimo. Privalomi laukai pažymėti *. Kainos laukas priima tik skaičius > 0. Įspėjimas, kai kaina nutolusi > 40 %. Prabangaus ženklo įspėjimas. | Testavimo atvejai | 5 |
| H6 | Atpažinimas, o ne prisiminimas | Kategorija, spalva, dydis ir būklė renkamos iš sąrašų. Ženklas siūlomas iš sąrašo (datalist) arba kaip 3 DI variantai. | Informacija | 5 |
| H7 | Lankstumas ir efektyvumas | 4 žingsniai. DI užpildo rutininius laukus, Mantui po paskelbimo siūloma „Kurti kitą skelbimą“. Laikas iki paskelbimo realiais naudotojais dar nematuotas (tikslas ≤ 2 min). | Visas F1+F2 srautas | 4 |
| H9 | Klaidų atpažinimas ir taisymas | Klaida rodoma prie lauko, o fokusas perkeliamas į pirmą klaidingą lauką (E4). Pakeitus kategoriją susiję laukai perskaičiuojami ir rodomas „Prieš / po“ langas: [Priimti] [Atšaukti] (A3). | Informacija → pakeisti kategoriją | 5 |
| DI1 | Aišku, ką DI gali (G1) | Pirmo karto langas „Ką DI daro su nuotraukomis?“. Nuolatinis pranešimas „DI nemato dydžio, defektų ir autentiškumo“. Laukai ✎ pažymėti „įveskite patys“. | Pirmas „Užpildyti su DI“ | 5 |
| DI2 | Aišku, kaip gerai DI veikia (G2) | Pasitikėjimas prie lauko (aukštas / vidutinis / žemas su %). Kainai rodomas intervalas, ne vienas skaičius. Patikimumo žymė aukštas / vidutinis / žemas. Kai palyginamų < 8, rodomas orientacinis intervalas. | Kaina | 5 |
| DI3 | Paaiškinama, kodėl (G11) | Prie kiekvieno lauko „Kodėl?“: nuotraukoje pažymėta sritis, etiketės ištrauka, pasitikėjimas. Kainai: „Pagal 14 panašių prekių, parduotų per 90 d.“, veiksnių indėlis ir palyginamos prekės su nuotraukomis. | Informacija, Kaina | 5 |
| DI4 | Efektyvus taisymas (G9) | ↻ vienam laukui, „Ne tas pats“ palyginamai prekei (intervalas perskaičiuojamas, galima atšaukti). Pardavėjo įvestų laukų DI nekeičia. | Informacija, Kaina | 5 |
| DI5 | Grįžtamasis ryšys DI (G15) | „Neteisinga“ su priežastimi vienu paspaudimu. Pašalintos palyginamos prekės. Sutikimas naudoti nuotraukas mokymui (numatytai išjungtas). | Kodėl? → Neteisinga | 4 (realaus mokymo ciklo prototipe nėra) |
| DI6 | Skaidrumas pirkėjui | Pirkėjo vaizde žymė „Aprašymas parengtas su DI, patvirtino pardavėjas“ (ES DI akto 50 str.). | Peržiūra, Pradžia → Naujausi skelbimai | 5 |
| DI7 | Atsakomybė | Privalomas patvirtinimas „Patikrinau DI pasiūlymus… Už turinį atsakau aš“, be jo paskelbti negalima. | Peržiūra | 5 |
| DI8 | Prieinamumas rinkose ir kalbomis | Visa sąsaja ir generuojami tekstai lietuviškai, etiketės OCR LT/EN. | Visur | 5 |

## 2. ND1 scenarijai S1–S6 prototipe

| Nr. | Scenarijus | Rezultatas prototipe |
|---|---|---|
| S1 | Paprastas daiktas, 1 nuotrauka | Testas „Be etiketės“: kategorija ir spalva ✓, ženklas „?“, sudėtis tuščia (DI nemato), dydis ir būklė ✎. Kaina 12–18 €. |
| S2 | Žinomas ženklas (logotipas) | Testas „Keli daiktai“ → džinsai: ženklas „?“ su variantais (American Eagle, Levi's, Wrangler). Dydžio DI neįrašo, laukas ✎. |
| S3 | Dviprasmė nuotrauka (keli daiktai) | DI klausia „Kurį daiktą parduodate?“, rodo ribas nuotraukoje ir siūlo variantą „Visi kartu – rinkinys“. |
| S4 | Brangi prekė / galima klastotė | Įrašius prabangų ženklą (pvz., Gucci) rodomas įspėjimas prie lauko ir kainos žingsnyje. Po paskelbimo skelbimą tikrina moderatorius. |
| S5 | Prasta nuotrauka | Įspėjimas „Per tamsu / neryški“: [Įkelti iš naujo] [Tęsti vis tiek]. Tęsiant visi DI laukai tampa „?“, skelbimas nesugeneruojamas kaip faktas. |
| S6 | Pataisyti kategoriją ir kainą | Pakeitus kategoriją atsiranda „Prieš / po“ langas pavadinimui ir aprašymui (1 paspaudimas). Kainą galima pakeisti strategija arba savo kaina (1–2 veiksmai). |

## 3. Užduoties reikalavimų atitiktis

| Nr. | Reikalavimas | Kur įgyvendinta |
|---|---|---|
| 1 | Pradinis puslapis + 2 DI funkcijos | Pradžia, F1, F2 |
| 2 | Įvestis, įvesties kontrolė, pranešimai | Nuotraukos (1–5, formatas, kokybė), etiketės žymė, privalomi laukai, kainos validacija |
| 3 | Išvesties formatas ir priklausomybė nuo DI | ✓ / ? (3 variantai) / tuščia pagal slenksčius 0,90 / 0,60; intervalas, 3 strategijos ir patikimumas pagal palyginamų skaičių |
| 4 | HITL veiksmai ir trigeriai | „Apie DI“ → HITL lentelė; prototipe kiekvienas trigeris veikia |
| 5 | Scenarijus su A1–A7, E1–E8 | A1 kelių daiktų pasirinkimas, A2 „Kodėl?“, A3 „Prieš / po“, A4 juodraštis, A5 „Pildyti be DI“ / grąžinti, A6 tonas, A7 kainos kortelė; E1–E8 per testavimo atvejus |
| 6 | Augmentacija su HITL | Nieko nepaskelbiama ir kaina neįrašoma be žmogaus |
| 7 | Srautai visoms personoms | Rūta (R1) ir Mantas (R2) perjungiami šoniniame meniu arba pradžios puslapyje; Ieva (R3) mato pirkėjo vaizdą ir DI žymę |
| 8 | Sėkmė / klaida / žemas pasitikėjimas | Pradžia → „Testavimo atvejai“: po 6 atvejus F1 ir 4 atvejus F2 |
| 9 | Human-AI gairės (HITL) | Žr. 4 skyrių |
| 10 | UI pagal personą ir riziką | Rūtai paprastas tonas ir aiškūs paaiškinimai; Mantui dalykiškas tonas ir greitas kitas skelbimas; rizikingi veiksmai (kaina, paskelbimas) su privalomu patvirtinimu |
| 11 | Modelio apmokymo komentaras | „Apie DI“ → duomenys, modeliai, NLP, GenAI, RAG, kontrolės taškai |
| 12 | FN ar FP | „Apie DI“ → lentelė; UI: slenksčiai, „?“, privalomas pasirinkimas, > 40 % įspėjimas |
| 13 | Verifikacija pagal ND1 | Šis dokumentas |

## 4. Guidelines for Human-AI Interaction (Amershi ir kt., 2019)

| Gairė | Įgyvendinimas |
|---|---|
| G1 Aišku, ką sistema gali | Langas „Ką DI daro su nuotraukomis?“, pranešimas „DI nemato…“ |
| G2 Aišku, kaip gerai | Pasitikėjimo žymės, %, intervalas, patikimumo lygis |
| G3 Laiku | DI paleidžiamas tik paspaudus „Užpildyti su DI“ |
| G4 Kontekstinė informacija | „Kodėl?“ prie konkretaus lauko, palyginamos prekės šalia kainos |
| G7 Lengva iškviesti | ↻ prie lauko, „Užpildyti tuščius“ |
| G8 Lengva atmesti | Keisti lauką, „Pildyti be DI“, „Ne tas pats“ |
| G9 Lengva taisyti | Lauko taisymas, „Prieš / po“, „Grąžinti DI versiją“ |
| G10 Abejojant – patikslinti | „?“ su 3 variantais, klausimas „Kurį daiktą parduodate?“ |
| G11 Paaiškinti kodėl | Pažymėta sritis, etiketės ištrauka, veiksniai |
| G12 Atsiminti kontekstą | Automatinis juodraštis su DI būsena |
| G15 Grįžtamasis ryšys | „Neteisinga“ su priežastimi |
| G16 Pasekmės | Įspėjimai apie per mažą kainą, „Už turinį atsakote jūs“ |
| G17 Globali kontrolė | Sutikimas mokymui, „Pildyti be DI“ |
| G18 Pranešti apie pokyčius | „DI užpildė N tuščius laukus. Jūsų įvestų nekeitėme.“ |

## 5. Ribotumai

- DI atpažinimas ir kainodara imituojami. Savoms nuotraukoms tipas, spalva ir sudėtis pateikiami kaip „?“, nes prototipas jų iš tikrųjų neatpažįsta.
- Duomenys (juodraščiai, skelbimai) saugomi tik naršyklėje (localStorage), serverio nėra.
- Naudojamumo testas su realiais naudotojais (laikas, SUS) dar neatliktas.
