# Second-hand prototype — „Antras kartas“

Dėvėtų drabužių prekyvietės GUI prototipas su DI funkcijomis (VILNIUS TECH, „Vartotojo patyrimas dirbtinio intelekto sprendimuose“, 3 namų darbas).

- **F1 „Skelbimas iš nuotraukų“** — DI siūlo kategoriją, atributus, pavadinimą ir aprašymą; pardavėjas tikrina ir tvirtina (HITL).
- **F2 „Kiek prašyti?“** — kainos intervalas pagal panašias parduotas prekes, 3 strategijos; kainą pasirenka pardavėjas.

Visi ND2 scenarijai (A1–A7, E1–E8) pasiekiami per pradžios puslapio „Testavimo atvejus“. Verifikacija pagal ND1 sąrašą — [VERIFIKACIJA.md](VERIFIKACIJA.md).

DI skaičiavimai imituojami („juoda dėžė“); nuotraukos kokybės ir spalvos patikra veikia su tikrais pikseliais.

## Paleidimas

```bash
pnpm install
pnpm dev      # kūrimo serveris
pnpm build    # statinė svetainė į dist/
```

`dist/` aplanką galima įkelti į Netlify Drop, Cloudflare Pages ar GitHub Pages.
