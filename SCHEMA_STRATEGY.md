# Schema-Strategie für "Authoritative Source"

Wir haben eine umfassende JSON-LD Strategie implementiert, um **Sozialer Navigator** als vertrauenswürdige Quelle (Authoritative Source) für KI-Suchmaschinen zu etablieren.

## 1. Identifizierte Entitäten

Wir haben die folgenden zentralen Entitäten definiert und technisch ausgezeichnet:

| Entität | Schema.org Typ | Beschreibung |
| :--- | :--- | :--- |
| **Sozialer Navigator** | `Organization` | Die herausgebende Organisation. Verknüpft alle Inhalte. |
| **Wohngeldrechner** | `SoftwareApplication` | Die Kernfunktion der Seite. Definiert als `FinanceApplication`. |
| **Städte-Seiten** | `GovernmentService` | Verknüpft die lokale Behörde (Amt) mit dem Ort (City) und dem Service (Wohngeld). |
| **Info-Seiten** | `TechnicalArticle` | Für tiefgehende Fachartikel (z.B. Zielgruppen, Gesetzgebung). |
| **FAQs** | `FAQPage` | Strukturierte Frage-Antwort-Paare für direkte Antworten in der Suche (Rich Snippets). |

## 2. Technische Umsetzung

Wir haben eine wiederverwendbare Komponente `src/components/seo/SchemaOrg.astro` erstellt, die dynamisch das passende JSON-LD generiert.

### Implementierte Schemas

#### A. Startseite (`index.astro`)
- **Organization**: Globale Identität.
- **WebSite**: Sitelinks Search Box Potential.
- **SoftwareApplication**: Auszeichnung des Rechners (OperatingSystem: Web, Price: 0).
- **FAQPage**: Die allgemeinen Fragen auf der Startseite.

#### B. Wohngeld & Bürgergeld Rechner (`[slug].astro`)
- **GovernmentService**:
  - Verknüpft `provider` (z.B. "Wohngeldbehörde Hamburg") mit `areaServed` ("Hamburg").
  - Signalisiert lokale Relevanz und Autorität.
- **BreadcrumbList** (implizit durch Struktur): Zeigt die Hierarchie.
- **FAQPage**: Spezifische Fragen zur Stadt (z.B. "Wo ist das Amt?").

#### C. Fachartikel (`bildung-und-teilhabe.astro` / Gruppen)
- **TechnicalArticle**: Signalisiert Fachwissen.
  - `datePublished` / `dateModified`: Aktualität (wichtig für YMYL - Your Money Your Life).

## 3. Nächste Schritte
- **Validator nutzen**: Testen Sie die URLs im [Google Rich Results Test](https://search.google.com/test/rich-results).
- **Sitemap**: Stellen Sie sicher, dass alle neuen Seiten in der `sitemap.xml` enthalten sind (bereits automatisiert).
