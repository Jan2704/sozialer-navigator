---
name: dev-loop
description: Autonomer Entwicklungs-Loop für sozialer-navigator. Nutzen, wenn eine Routine/Session ohne menschliche Anwesenheit die nächste sinnvolle Aufgabe aus brain.md finden, umsetzen, prüfen, festhalten und wiederholen soll.
---

# dev-loop: Autonomer Entwicklungszyklus

Dieses Skill kapselt Projektkontext und Arbeitsweise, damit jede neu gestartete
Session sofort produktiv ist, ohne dass der Kontext erneut erklärt werden muss.

## Projekt in Kürze

- **sozialer-navigator**: Astro 5 + React + Tailwind v4, deutsche Social-Benefits-
  Navigator-Seite (Wohngeld/Bürgergeld-Rechner, Behördensuche, Antragsversand).
- Zentrales Gedächtnis: **`brain.md`** im Repo-Root — Roadmap, Status, Architektur,
  Design-Regeln. Vor jeder Iteration lesen, nach jeder Iteration aktualisieren.
- Build-Check: `npm install && npm run build` (Astro-Build) muss grün sein, bevor
  etwas als erledigt gilt. Es gibt keine automatisierten Tests, daher ist der Build
  + eine kurze manuelle Plausibilitätsprüfung der Mindeststandard.
- Arbeits-Branch: `claude/create-loop-e5s3hz`. Alle Commits gehen dorthin (per
  Merge aus Worktree-Branches, siehe unten), nicht direkt auf `main`.

## Der Zyklus: Finden → Machen → Prüfen → Merken → Wiederholen

1. **Finden**: `brain.md` nach offenen Punkten (`- [ ]`) durchsuchen, dazu grob den
   Code auf offensichtliche Bugs/TODOs prüfen. Eine oder — falls klar unabhängig
   voneinander — bis zu zwei klar abgegrenzte Aufgaben auswählen.
2. **Machen**:
   - Bei **einer** Aufgabe: direkt auf dem Arbeits-Branch umsetzen.
   - Bei **zwei unabhängigen** Aufgaben (kein Dateiüberlapp zu erwarten): je einen
     `Agent`-Aufruf mit `isolation: "worktree"` starten, sodass beide parallel und
     kollisionsfrei arbeiten. Jeder Worktree-Agent bekommt eine in sich
     abgeschlossene Aufgabenbeschreibung (Datei, Ziel, Kontext aus diesem Skill).
3. **Prüfen** (getrennt von Schritt 2 — wer schreibt, prüft nicht sich selbst):
   - `npm run build` muss erfolgreich sein.
   - Zusätzlich einen **separaten** Subagenten (z.B. `general-purpose`, frischer
     Kontext, KEIN Kontext aus dem Implementierungs-Agenten) den Diff review'en
     lassen: offensichtliche Bugs, Sicherheitsprobleme, Scope-Creep, Design-System-
     Konsistenz (siehe brain.md Abschnitt "Design Philosophy"). Findings vor dem
     Commit beheben oder bewusst zurückstellen und in brain.md vermerken.
   - Bei rechtlich/ethisch heiklen Inhalten (z.B. erfundene Testimonials, Health-/
     Rechtsberatungs-Formulierungen, personenbezogene Daten) NICHT eigenmächtig
     live schalten — in brain.md als offenen Punkt mit Begründung festhalten und,
     falls die Session interaktiv ist, `AskUserQuestion` nutzen. In einer
     unbeaufsichtigten Routine-Session stattdessen konservativ bleiben (nicht
     veröffentlichen) und den Punkt in brain.md klar markieren.
4. **Merken**:
   - Bei Worktree-Parallelarbeit: fertige Worktree-Branches einzeln in den
     Arbeits-Branch mergen (nacheinander, um Konflikte sauber aufzulösen).
   - Commit mit prägnanter Message (Konvention: `feat|fix|docs(scope): ...`).
   - `brain.md` aktualisieren: `Last Updated`, abgehakte Punkte, neue offene
     Punkte/Erkenntnisse, kurze Begründung bei zurückgestellten Entscheidungen.
   - `git push -u origin claude/create-loop-e5s3hz`.
5. **Wiederholen**: Nächste offene Aufgabe aus `brain.md` suchen. Wenn keine
   sinnvolle nächste Aufgabe mehr existiert, das in brain.md vermerken und die
   Iteration ohne Änderungen beenden (nicht künstlich Arbeit erfinden).

## Nicht tun

- Keine Aufgaben erledigen, die nicht in brain.md oder als offensichtlicher Bug
  im Code stehen — keine neuen Features erfinden.
- Keine Force-Pushes, kein Löschen fremder Branches, keine Änderungen an CI/
  Secrets/Deploy-Konfiguration ohne expliziten Auftrag.
- Keine PRs erstellen, außer explizit angefordert.
