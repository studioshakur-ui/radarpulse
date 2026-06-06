# RADARPULSE — FORENSIC DESIGN AND MARKETING AUDIT
**Date :** 2026-03-20
**Perimetre :** Landing page, Inbox, Dossier detail, UK Country, Global, Dossiers dashboard, Settings
**Objectif :** Atteindre 10/10 sur chaque dimension via sprints cibles

---

## SCORECARD INITIAL (etat au 2026-03-20)

| Dimension | Score actuel | Cible |
|---|---|---|
| Visual coherence | 5/10 | 10/10 |
| Premium perception | 4/10 | 10/10 |
| Brand alignment | 4/10 | 10/10 |
| Marketing clarity | 6/10 | 10/10 |
| Value proposition clarity | 5/10 | 10/10 |
| Trust / credibility | 3/10 | 10/10 |
| CTA strength | 6/10 | 10/10 |
| Conversion readiness | 4/10 | 10/10 |
| UX efficiency | 5/10 | 10/10 |
| Component discipline | 4/10 | 10/10 |
| Language consistency | 3/10 | 10/10 |
| **Overall commercial readiness** | **4/10** | **10/10** |

---

## VERDICT EXECUTIF

RadarPulse dispose d'une infrastructure technique solide et d'une proposition de valeur reelle sur un marche de niche. Mais en l'etat actuel, le produit envoie des signaux contradictoires : interface en cours de construction exposee a des prospects, copie melant vocabulaire developpeur et langage metier, navigation fragmentee, et zero signal de confiance ou de credibilite.

**Le produit ne convertira pas.** Pas parce que la valeur n'existe pas - elle existe - mais parce que rien dans l'interface ne convainc un acheteur exigeant qu'il peut faire confiance a ce produit avec son pipeline commercial.

Priorite absolue : reparer la confiance, unifier le langage, fermer les portes internes.

---

## TOP FORCES

1. **Donnees riches** — les dossiers contiennent des informations denses et utiles (titulaire, montant, CPV, dates)
2. **Structure bilingue FR/UK** — la couverture multi-marche est un vrai differenciateur
3. **Inbox avec filtres** — le concept de flux de veille est pertinent pour le cas usage
4. **Page pays** — la vue agregee par pays (GB) avec metriques est prometteuse
5. **Navigation principale claire** — Inbox / Dossiers / Countries / Global couvre bien le parcours utilisateur

---

## TOP ECHECS

### Critiques (bloquants pour la conversion)

**C1 — "UI STANDARDS" visible dans Settings**
- Page : `/settings`
- Element : section entiere "UI STANDARDS" avec sous-sections Typography, Colors, Spacing, Components
- Probleme : c'est un guide de style developpeur expose en production a des clients payants
- Consequence : destruction immediate de la credibilite premium ; signal "produit en beta inacheve"
- Correction : supprimer entierement de la nav Settings, deplacer dans `/dev` ou storybook interne

**C2 — Onglet "Dev" dans la navigation principale**
- Page : toutes
- Element : lien "Dev" dans la navbar
- Probleme : acces direct a des outils internes depuis l'interface client
- Consequence : confusion utilisateur, signal amateur, risque exposition donnees internes
- Correction : conditionner a `NODE_ENV=development` ou role admin uniquement

**C3 — Vocabulaire developpeur en copie utilisateur**
- Pages : Inbox, Dossiers, Settings
- Elements : "OTHER" comme badge categorie sur 100% des items, labels techniques
- Probleme : "OTHER" n'est pas un label metier ; c'est un fallback de code non remplace
- Consequence : perte de confiance, impression de bug ou d'incompletude
- Correction : mapper vers labels metier (Travaux, Services, Fournitures, Non classe)

**C4 — Texte brut bilingue gallois/anglais dans les dossiers**
- Page : `/workspace/[uuid]`
- Element : titre et description du dossier en gallois + anglais concatenes sans separation
- Probleme : le contenu brut de la source officielle est affiche sans traitement
- Consequence : UX degradee, impression de bug, illisibilite pour 95% des utilisateurs
- Correction : afficher la langue principale detectee, proposer toggle si bilingue

### Hauts (freinent la conversion)

**H1 — Navigation fragmentee app/pays**
- Le passage de `/dossiers` a `/countries/GB` rompt le fil de navigation ; pas de breadcrumb coherent

**H2 — Boutons de decision incoherents**
- "NO" sur certains dossiers, "NO-GO" sur d'autres ; pas de systeme semantique unifie

**H3 — Empty states sans guidance**
- Les vues vides (inbox filtre, global sans donnees) n'expliquent pas quoi faire ni pourquoi c'est vide

**H4 — Zero social proof sur la landing**
- Aucun temoignage, logo client, chiffre d'usage, ou validation tier

**H5 — Headlines landing qui rotationnent**
- Le carousel de valeur prop cree de l'incertitude ; le message principal doit etre fixe et fort

**H6 — Pas de pricing visible**
- Aucune page pricing accessible depuis la landing ou l'app ; friction maximale pre-conversion

### Moyens (degradent l'experience)

**M1 — Icones sans labels sur mobile/compact**
- La navbar utilise des icones seules sans texte en vue reduite ; ambiguite de destination

**M2 — Typographie inconsistante**
- Mix de tailles, graisses et familles de police entre pages (landing vs app)

**M3 — Couleurs de statut non systematisees**
- Les badges de statut utilisent des couleurs ad hoc sans systeme semantique clair

**M4 — Dates sans contexte relatif**
- Les dates d'expiration affichees en format absolu (DD/MM/YYYY) sans "dans X jours" pour l'urgence

**M5 — CTA "Get Started" generique sur la landing**
- Pas de specification de ce qui se passe apres le clic ; friction cognitive pre-inscription

---

## PROBLEMES DESIGN SYSTEMIQUES

1. **Absence de design system applique** — les composants sont construits au cas par cas sans referentiel unifie. Chaque page a ses propres conventions de spacing, couleur, typographie.

2. **Etats des composants non definis** — hover, focus, disabled, loading, error : la plupart des composants n'ont que l'etat "normal" defini. Les etats interactifs sont inconsistants.

3. **Responsive non traite** — l'interface est construite pour desktop 1440px. Aucune adaptation mobile visible sur les pages app (inbox, dossiers).

4. **Hierarchie visuelle faible** — les pages manquent de contrast clair entre elements primaires, secondaires, et tertiaires. Tout a le meme poids visuel.

---

## PROBLEMES MARKETING SYSTEMIQUES

1. **Proposition de valeur non ancree** — la valeur de RadarPulse (gain de temps, avantage concurrentiel, ROI sur les appels d'offres) n'est jamais quantifiee ni illustree avec des cas concrets.

2. **Audience cible floue** — qui est l'utilisateur ideal ? PME, grands groupes, consultants independants ? Le produit ne prend pas de position claire.

3. **Parcours de conversion inexistant** — il n'y a pas de funnel visible : landing -> trial -> onboarding -> valeur -> upgrade. Chaque etape est une ile.

4. **Credibilite absente** — aucun signal de confiance : pas de nombre d'utilisateurs, pas de marches monitores, pas de valeur de contrats analyses, pas de logo client.

5. **Language mixing FR/EN non assume** — le produit est en anglais avec des elements francais non consistants. Il faut choisir une langue principale par marche.

---

## AUDIT PAGE PAR PAGE

| Page | Score | Forces | Problemes prioritaires |
|---|---|---|---|
| Landing `/` | 4/10 | Headline comprehensible, CTA visible | Pas de social proof, headlines rotationnelles, pas de pricing, pas de demo video |
| Dossiers `/dossiers` | 5/10 | Filtres fonctionnels, donnees riches | Badge "OTHER" partout, dates sans contexte relatif, pas d'actions bulk |
| Inbox `/inbox` | 5/10 | Split panel pertinent, filtres presents | "OTHER" sur tous items, empty state vide, pas de marquage lu/non-lu visible |
| UK Country `/countries/GB` | 6/10 | Metriques agregees utiles, structure claire | Pas de lien retour coherent, pas d'export, metriques sans tendance temporelle |
| Global `/global` | 4/10 | Concept multi-pays pertinent | Page peu dense, valeur ajoutee vs pays individuel peu claire, pas de comparaison |
| Dossier detail `/workspace/[uuid]` | 5/10 | Donnees completes, structure longue-forme | Texte bilingue brut, boutons NO/NO-GO incoherents, pas de timeline visible |
| Settings `/settings` | 2/10 | Navigation des sections presente | "UI STANDARDS" expose, pas de section profil/equipe claire, melange dev/user |

---

## PLAN D'ACTION PAR SPRINTS

---

### SPRINT 1 — Trust Repair (Priorite : CRITIQUE — A faire avant tout lancement)

**Objectif :** Eliminer tous les signaux qui brisent la confiance et fermer les portes internes

| ID | Action | Page(s) | Impact |
|---|---|---|---|
| S1-01 | Supprimer la section "UI STANDARDS" de Settings | `/settings` | Critique |
| S1-02 | Conditionner l'onglet "Dev" a `NODE_ENV=development` | Toutes | Critique |
| S1-03 | Remplacer le badge "OTHER" par labels metier (Travaux, Services, Fournitures, Non classe) | Inbox, Dossiers | Critique |
| S1-04 | Traiter l'affichage bilingue : detecter langue principale, proposer toggle | Dossier detail | Critique |
| S1-05 | Auditer toutes les routes et supprimer/proteger les pages non destinees aux clients | Toutes | Critique |

**KPI :** Zero element developpeur visible par un utilisateur non-admin. Score Trust : 3 -> 8/10

---

### SPRINT 2 — Navigation Unification

**Objectif :** Creer un parcours coherent et sans rupture dans toute l'application

| ID | Action | Page(s) | Impact |
|---|---|---|---|
| S2-01 | Implementer un breadcrumb global coherent (Dossiers > [Nom] > Detail) | App entiere | Haut |
| S2-02 | Unifier les boutons de decision : systeme GO / NO-GO / WATCH avec couleurs semantiques | Dossier detail, Inbox | Haut |
| S2-03 | Ajouter des empty states informatifs avec action suggere | Inbox, Global | Haut |
| S2-04 | Relier la page pays a la navigation principale (retour, contexte, lien dossiers filtres) | Countries | Moyen |

**KPI :** Utilisateur peut naviguer de landing a dossier detail sans confusion. Score UX : 5 -> 8/10

---

### SPRINT 3 — Component Discipline

**Objectif :** Uniformiser les composants et etablir un mini design system

| ID | Action | Page(s) | Impact |
|---|---|---|---|
| S3-01 | Definir et appliquer une echelle typographique unique (H1/H2/H3/Body/Caption) | App entiere | Haut |
| S3-02 | Creer un systeme de couleurs semantiques pour les statuts (vert=actif, rouge=expire, orange=urgent) | Dossiers, Inbox | Haut |
| S3-03 | Standardiser les cards de dossier (meme structure, meme hierarchy, memes actions) | Dossiers, Inbox | Moyen |
| S3-04 | Ajouter les dates relatives ("dans 3 jours", "expire hier") en complement des dates absolues | Dossiers, Inbox | Moyen |

**KPI :** Un composant = une seule implementation. Score Component discipline : 4 -> 9/10

---

### SPRINT 4 — Empty States et Onboarding

**Objectif :** Guider l'utilisateur a chaque etape, surtout quand il n'y a pas encore de donnees

| ID | Action | Page(s) | Impact |
|---|---|---|---|
| S4-01 | Empty state Inbox : illustration + texte "Aucune opportunite correspondante - ajustez vos filtres" + bouton | `/inbox` | Haut |
| S4-02 | Empty state Global : expliquer la valeur de la vue globale + inviter a configurer des pays | `/global` | Moyen |
| S4-03 | Onboarding flow minimal : etapes "choisissez vos marches" -> "definissez vos mots-cles" -> "premiere veille" | Premiere connexion | Haut |
| S4-04 | Tooltips contextuels sur les metriques cles (CPV, titulaire, montant) pour les nouveaux utilisateurs | Dossier detail | Moyen |

**KPI :** Taux d'activation J1 ameliore. Score UX efficiency : 5 -> 8/10

---

### SPRINT 5 — Marketing Power-Up

**Objectif :** Transformer la landing en machine de conversion avec preuves et valeur quantifiee

| ID | Action | Page(s) | Impact |
|---|---|---|---|
| S5-01 | Fixer une headline principale forte et non-rotationnelle (ex: "Gagnez les appels d'offres que vous ne saviez pas chercher") | Landing | Critique |
| S5-02 | Ajouter une section social proof : logos clients, temoignages, chiffres (X contrats analyses, Y utilisateurs) | Landing | Critique |
| S5-03 | Ajouter une section "Comment ca marche" en 3 etapes illustrees | Landing | Haut |
| S5-04 | Creer une page Pricing avec 2-3 plans clairement differencies | Landing + Nav | Haut |
| S5-05 | Remplacer "Get Started" par un CTA specifique ("Essayez gratuitement 14 jours" ou "Voir une demo") | Landing | Haut |

**KPI :** Taux de conversion landing -> inscription. Score Marketing clarity : 6 -> 9/10. Score Trust : 8 -> 10/10

---

### SPRINT 6 — Upgrade et Subscription Path

**Objectif :** Rendre visible et desirable le chemin vers l'upgrade

| ID | Action | Page(s) | Impact |
|---|---|---|---|
| S6-01 | Ajouter des prompts d'upgrade contextuels (ex: "Vous avez atteint votre limite de 10 dossiers - passez a Pro") | App entiere | Haut |
| S6-02 | Creer une page "Mon abonnement" dans Settings avec historique, plan actuel, et bouton upgrade | `/settings` | Haut |

**KPI :** Score Conversion readiness : 4 -> 8/10

---

### SPRINT 7 — Language Audit Systemique

**Objectif :** Uniformiser la langue et le ton dans toute l'application

| ID | Action | Page(s) | Impact |
|---|---|---|---|
| S7-01 | Choisir une langue principale par marche (EN pour UK, FR pour France) et appliquer rigoureusement | App entiere | Haut |
| S7-02 | Creer un glossaire metier : termes autorises (Dossier, Opportunite, Marche, Titulaire) vs interdits (OTHER, item, record) | App entiere | Haut |
| S7-03 | Passer toute la copie UI par une revue editoriale : labels, messages d'erreur, placeholders, tooltips | App entiere | Moyen |

**KPI :** Score Language consistency : 3 -> 9/10

---

## RECAPITULATIF SPRINTS

| Sprint | Priorite | Dimensions impactees | Effort estime |
|---|---|---|---|
| Sprint 1 — Trust Repair | CRITIQUE | Trust, Brand alignment, Language consistency | 2-3 jours |
| Sprint 2 — Navigation Unification | HAUTE | UX efficiency, Component discipline | 3-4 jours |
| Sprint 3 — Component Discipline | HAUTE | Visual coherence, Component discipline, Premium perception | 4-5 jours |
| Sprint 4 — Empty States + Onboarding | MOYENNE | UX efficiency, Conversion readiness | 3-4 jours |
| Sprint 5 — Marketing Power-Up | HAUTE | Marketing clarity, Value prop, Trust, CTA strength | 5-7 jours |
| Sprint 6 — Upgrade Path | MOYENNE | Conversion readiness, CTA strength | 2-3 jours |
| Sprint 7 — Language Audit | MOYENNE | Language consistency, Brand alignment | 2-3 jours |

---

## PROJECTION SCORECARD APRES SPRINTS

| Dimension | Score actuel | Apres S1 | Apres S1+S2 | Apres tous sprints |
|---|---|---|---|---|
| Visual coherence | 5/10 | 5 | 6 | 9/10 |
| Premium perception | 4/10 | 5 | 6 | 9/10 |
| Brand alignment | 4/10 | 6 | 7 | 9/10 |
| Marketing clarity | 6/10 | 6 | 6 | 9/10 |
| Value proposition clarity | 5/10 | 5 | 5 | 9/10 |
| Trust / credibility | 3/10 | 8 | 8 | 10/10 |
| CTA strength | 6/10 | 6 | 6 | 9/10 |
| Conversion readiness | 4/10 | 5 | 6 | 9/10 |
| UX efficiency | 5/10 | 5 | 8 | 9/10 |
| Component discipline | 4/10 | 4 | 7 | 9/10 |
| Language consistency | 3/10 | 7 | 8 | 9/10 |
| **Overall commercial readiness** | **4/10** | **6/10** | **7/10** | **9-10/10** |

---

## GUARDRAILS NON-NEGOCIABLES

Ces regles doivent etre appliquees avant tout merge en production :

1. **Zero element developpeur visible** — UI Standards, onglet Dev, labels techniques : jamais en prod
2. **Zero badge "OTHER"** — chaque categorie doit avoir un label metier intelligible
3. **Zero texte brut bilingue non traite** — toujours detecter et afficher la langue principale
4. **Toujours un empty state actionnable** — jamais une page vide sans explication ni CTA
5. **Toujours une headline fixe sur la landing** — pas de carousel de valeur prop en hero
6. **Toujours un chemin vers le pricing** — visible depuis la landing ET depuis l'app
7. **Toujours des dates relatives pour l'urgence** — complement obligatoire aux dates absolues
8. **Un seul systeme de decision** — GO / NO-GO / WATCH, point
9. **Une seule langue par interface** — pas de mixing FR/EN dans la meme vue
10. **Social proof avant tout lancement public** — meme un seul temoignage vaut mieux que rien

---

## VERITE FINALE

RadarPulse est un produit qui cherche encore sa forme commerciale. Les donnees sont la, le concept est bon, le marche existe. Mais l'interface parle encore le langage de son equipe de construction plutot que le langage de ses clients.

La priorite numero un n'est pas d'ajouter des features. C'est de retirer ce qui brise la confiance, puis d'articuler clairement pourquoi quelqu'un devrait payer pour ce produit.

**Sprint 1 d'abord. Tout le reste apres.**
