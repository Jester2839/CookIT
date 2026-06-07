# Zadání projektu: CookIT – Chytrý pomocník v kuchyni

**Jméno studenta:** Jakub Nový  
**Název projektu:** CookIT – Chytrý pomocník v kuchyni

---

## 1. Účel aplikace (Use-case)

Cílem projektu je vytvořit responzivní webovou aplikaci, která uživateli pomůže efektivně využít suroviny, které má aktuálně doma. Hlavním use-casem je situace, kdy uživatel zadá seznam dostupných ingrediencí, co má doma a aplikace mu na základě těchto dat vyhledá relevantní recepty. Aplikace je určena pro každodenní použití v domácnosti s důrazem na rychlost, přehlednost a možnost pracovat v režimu offline přímo v kuchyni.

Aplikace bude také obsahovat inteligentní našeptávač (*autocomplete*, s prodlevou), který na základě API volání usnadní uživateli zadávání ingrediencí a minimalizuje překlepy. Detail receptu bude rozšířen o nutriční informace (kalorie, makroživiny) získávané z API, což umožní uživateli sledovat energetickou hodnotu pokrmů.

---

## 2. Funkcionalita a práce s JavaScriptem

Aplikace bude postavena na JavaScriptu a bude využívat následující principy:

- **Dynamická manipulace s DOM:** Generování karet receptů, detailů pokrmu a nákupního seznamu na základě získaných dat.
- **Komunikace s REST API:** Integrace veřejného API Spoonacular pro vyhledávání receptů podle ingrediencí pomocí `fetch` a `async`/`await`.
- **Lokální úložiště (localStorage):**
  - Ukládání oblíbených receptů (srdíčko) a nákupního seznamu, které zůstanou dostupné i po zavření prohlížeče.
  - Správa nákupního seznamu (uživatel si může z receptu odkliknout suroviny, které mu chybí, které se následně přidají do nákupního seznamu).
- **Validace vstupů:** Kontrola zadávaných ingrediencí a ošetření chybových stavů (např. nenalezení žádného receptu, výpadek API).

---

## 3. Technické zpracování (HTML/CSS)

- **Responzivita:** Layout bude plně přizpůsoben pro mobilní telefony, tablety i desktop s využitím CSS Grid a Flexboxu.
- **Design:** Moderní a čisté uživatelské rozhraní zaměřené na čitelnost postupu přípravy jídla. (Po zadání surovin se zobrazí seznam možných jídel, po výběru jídla se zobrazí celý postup i s potřebnými ingrediencemi)
- **PWA (Progressive Web App):** Implementace `manifest.json` a `service-worker.js` pro možnost instalace na plochu a zajištění základní funkčnosti v offline režimu (přístup k uloženým oblíbeným receptům a nákupnímu receptu).

---

## 4. Datová struktura (příklad ukládaného objektu)

V rámci `localStorage` bude aplikace pracovat se dvěma hlavními strukturami: pro oblíbené recepty a pro nákupní seznam.

### A) Oblíbené recepty (`favorites`)
Ukládají se jako pole objektů, kde každý objekt reprezentuje jeden uložený recept.

```json
{
  "favorites": [
    {
      "id": 715415,
      "title": "Pečené kuře s bylinkami",
      "image": "https://...",
      "extendedIngredients": [
        {
          "id": 1005006,
          "name": "whole chicken",
          "original": "1 whole chicken (about 3-4 lbs)"
        }
      ],
      "nutrition": {
        "nutrients": [
          { "name": "Calories", "amount": 450, "unit": "kcal" },
          { "name": "Fat", "amount": 22, "unit": "g" }
        ]
      },
      "analyzedInstructions": [
        {
          "steps": [
            { "number": 1, "step": "Předehřejte troubu..." },
            { "number": 2, "step": "Okořeňte kuře..." }
          ]
        }
      ],
      "instructions": "Předehřejte troubu... Okořeňte kuře..."
    }
  ]
}
```

### B) Nákupní seznam (`shoppingList`)
Zde se ukládají jednotlivé chybějící ingredience, které si uživatel z receptu odklikl. Pro lepší přehlednost je vhodné ukládat i ID receptu, ze kterého položka pochází.

```json
{
  "shoppingList": [
    {
      "recipeTitle": "Pečené kuře s bylinkami",
      "name": "1 whole chicken (about 3-4 lbs)"
    },
    {
      "recipeTitle": "Pečené kuře s bylinkami",
      "name": "2 tbsp olive oil"
    },
    {
      "recipeTitle": "Domácí hovězí burger",
      "name": "500g ground beef"
    }
  ]
}
```
