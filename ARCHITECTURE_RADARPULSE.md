# RadarPulse — Architecture & Fonctionnement

## Vue d'ensemble

RadarPulse est une plateforme SaaS de veille sur les marchés publics italiens. Elle agrège automatiquement les appels d'offres et subventions depuis plusieurs sources (RSS, API, HTML), les enrichit par extraction IA (GPT-4), puis les présente dans une inbox filtrée aux utilisateurs abonnés.

**Stack technique :**
- Frontend : React 18 + Vite + TailwindCSS + TanStack Query
- Backend : Supabase (PostgreSQL 17 + Edge Functions Deno)
- Auth : Magic link custom (pas OAuth)
- Paiement : Stripe (checkout + webhooks)
- Email : Resend API
- IA : OpenAI GPT-4o-mini (extraction structurée)
- CI/CD : GitHub Actions (ingestion toutes les 15 min)

---

## 1. Structure du monorepo

```
radarpulse/
├── apps/web/                  # Frontend React (SPA)
│   ├── src/
│   │   ├── App.tsx            # Routeur principal + auth magic link
│   │   ├── main.tsx           # Entry point (QueryClient, I18n, Router)
│   │   ├── features/
│   │   │   ├── landing/       # Pages marketing + formulaire d'accès
│   │   │   ├── inbox/         # Inbox des opportunités (protégé)
│   │   │   ├── italy/         # Pages SEO Italie (régions, catégories)
│   │   │   ├── billing/       # Page abonnement Stripe
│   │   │   └── settings/      # Paramètres utilisateur
│   │   ├── lib/
│   │   │   ├── supabase.ts    # Client Supabase (session persistée)
│   │   │   ├── env.ts         # Variables d'environnement VITE_*
│   │   │   ├── types.ts       # Types TypeScript (Opportunity, Buyer…)
│   │   │   ├── edgeFunctions.ts # Client API Edge Functions
│   │   │   └── utils.ts       # Helpers (dates, classes CSS)
│   │   └── state/
│   │       └── theme.ts       # Zustand store (thème light/dark)
│   └── vite.config.ts
├── supabase/
│   ├── config.toml            # Config Supabase (ports, JWT, RLS)
│   ├── migrations/            # Migrations SQL (schéma, vues, index)
│   └── functions/
│       ├── _shared/           # Code partagé (db.ts, cors.ts, validation.ts)
│       ├── create-magic-link/ # Création token + envoi email
│       ├── verify-magic-link/ # Vérification token + création user/session
│       ├── notify-email/      # Envoi emails via Resend
│       ├── submit-access-request/ # Formulaire d'accès (audit trail)
│       ├── opportunities-search/  # Recherche inbox (protégé JWT)
│       ├── dispatcher/        # Planificateur d'ingestion
│       ├── ai-extract-light/  # Extraction IA (GPT-4)
│       ├── stripe-webhook/    # Webhooks Stripe
│       └── stripe-create-checkout/ # Création session Stripe
├── scripts/                   # Scripts utilitaires
├── docs/                      # Documentation
├── DEPLOY.ps1                 # Script de déploiement PowerShell
└── .github/workflows/         # CI/CD GitHub Actions
```

---

## 2. Parcours utilisateur complet

### Étape 1 — Landing Page (`/`)
L'utilisateur arrive sur la page marketing. Il voit les bénéfices, les guides, et un CTA "Demander l'accès".

### Étape 2 — Formulaire d'accès (`/request-access`)
- Saisie : nom, email, organisation, cas d'usage
- Le frontend appelle **`create-magic-link`** (Edge Function)
- Le serveur :
  1. Valide l'email (regex stricte)
  2. Génère un token crypto-sécurisé de 32 bytes (`crypto.getRandomValues`)
  3. Insère le token dans `magic_link_tokens` (expiration 24h)
  4. Insère dans `access_requests` (audit)
  5. Appelle **`notify-email`** pour envoyer le lien magique
- L'utilisateur voit un message de confirmation

### Étape 3 — Email reçu
L'utilisateur reçoit un email avec un bouton "Activate Access" pointant vers `https://app.radarpulse.io/?token=xxx`

### Étape 4 — Vérification du magic link
- `App.tsx` détecte `?token=xxx` dans l'URL
- Appelle **`verify-magic-link`** (Edge Function)
- Le serveur :
  1. Vérifie le token (non utilisé + non expiré)
  2. Cherche l'utilisateur par email via l'API admin Supabase (O(1))
  3. Si existant : rotation du mot de passe + sign in
  4. Si nouveau : création user + sign in
  5. Crée un abonnement trial de 7 jours dans `subscriptions`
  6. Marque le token comme utilisé
  7. Retourne `accessToken` + `refreshToken`
- Le frontend appelle `supabase.auth.setSession()` et redirige vers `/inbox`

### Étape 5 — Inbox (`/inbox`)
- Vérification de l'abonnement (actif/trial + `current_period_end > now()`)
- Appelle **`opportunities-search`** avec le JWT
- Affiche les opportunités avec filtres : recherche texte, statut, score qualité
- Pagination par curseur (infinite scroll)

### Étape 6 — Abonnement (`/abbonamento`)
- Après expiration du trial, redirection vers la page Stripe
- Création de session checkout via **`stripe-create-checkout`**
- Webhook Stripe met à jour `subscriptions` via **`stripe-webhook`**

---

## 3. Schéma de la base de données

### Tables principales

| Table | Rôle |
|-------|------|
| `magic_link_tokens` | Tokens d'authentification (email, token, used, expires_at) |
| `subscriptions` | Abonnements Stripe (user_id, status, period_end) |
| `access_requests` | Audit trail des demandes d'accès |
| `opportunities` | Opportunités enrichies (titre, acheteur, deadline, budget…) |
| `opportunities_raw` | Contenu brut avant extraction IA |
| `opportunity_ai` | Résultats d'extraction IA (type, secteur, budget, risques…) |
| `buyers` | Entités acheteuses normalisées |
| `sources` | Sources de données (RSS, API, HTML) avec schedule |
| `ingestion_jobs` | File d'attente des jobs d'ingestion |
| `notification_queue` | File d'attente des notifications (email, Telegram…) |

### Vues pré-calculées (performance)

- **`opportunities_search_v1`** — Vue principale pour la recherche
- **`opportunities_search_it_v1`** — Filtrée Italie uniquement
- **`opportunities_inbox_it_v1`** — Optimisée pour l'inbox (score qualité, complétude)

### Sécurité (RLS)

- `opportunities` : lecture publique (données de marchés publics)
- `magic_link_tokens` : accès `service_role` uniquement
- `subscriptions` : scoped par `user_id` (vérifié dans l'Edge Function)

---

## 4. Pipeline d'ingestion (données)

```
GitHub Actions (toutes les 15 min)
        │
        ▼
┌──────────────┐     ┌─────────────────┐
│  dispatcher  │────▶│ ingestion_jobs   │
│ Edge Function│     │ (queued)         │
└──────────────┘     └────────┬────────┘
                              │
                              ▼
                     ┌──────────────┐
                     │   worker     │ ← appelé jusqu'à 80x par run
                     │ Edge Function│
                     └──────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        Fetch RSS      Fetch API     Fetch HTML
        (ANAC, etc.)
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                   opportunities_raw
                     (contenu brut)
                            │
                            ▼
                   ┌────────────────┐
                   │ ai-extract-light│  GPT-4o-mini
                   └───────┬────────┘
                           ▼
                     opportunity_ai
                   (données structurées)
                           │
                           ▼
                     opportunities
                   (visible dans l'inbox)
```

### Sources configurées
Toutes les sources sont italiennes (`country_code = 'IT'`) :
- ANAC OCDS (API de l'autorité anticorruption)
- Autres flux RSS et pages HTML de marchés publics italiens

---

## 5. Edge Functions — Détail

### Publiques (sans JWT)

| Fonction | Méthode | Description |
|----------|---------|-------------|
| `create-magic-link` | POST | Crée un token + envoie l'email magic link |
| `verify-magic-link` | POST | Vérifie le token, crée/connecte l'user, retourne la session |
| `notify-email` | POST | Envoie des emails via Resend (magic_link, access_request, subscription) |
| `submit-access-request` | POST | Enregistre une demande d'accès (audit) |

### Protégées (JWT requis)

| Fonction | Méthode | Description |
|----------|---------|-------------|
| `opportunities-search` | POST | Recherche paginée dans l'inbox (filtre texte, statut, qualité) |
| `dispatcher` | POST | Planifie les jobs d'ingestion (appelé par GitHub Actions) |
| `ai-extract-light` | POST | Extraction IA sur le contenu brut (dev only) |
| `stripe-webhook` | POST | Traite les webhooks Stripe (signature vérifiée) |
| `stripe-create-checkout` | POST | Crée une session Stripe Checkout |

### Code partagé (`_shared/`)

- **`db.ts`** : Crée le client admin Supabase (`SB_URL` + `SERVICE_ROLE_KEY`)
- **`cors.ts`** : Headers CORS pour toutes les réponses
- **`validation.ts`** : Helpers de validation (email, UUID, date ISO, clamp)

---

## 6. Frontend — Architecture

### Routing (React Router 6)

```
/                    → LandingPage (marketing)
/request-access      → RequestAccessPage (formulaire magic link)
/abbonamento         → SubscribePage (Stripe checkout)
/italie/*            → Pages SEO Italie (régions, catégories, acheteurs)
/guides/*            → Pages de guides
/inbox               → InboxPage (protégé — abonnement requis)
/settings            → SettingsPage (thème, infos)
```

### Gestion d'état

- **Zustand** : uniquement pour le thème (light/dark/system)
- **TanStack Query** : tout le data fetching (cache 30s, 1 retry, pas de refetch au focus)
- **Supabase Auth** : session persistée en localStorage (`persistSession: true`)

### Composants clés

- **`AppShell`** : Layout avec navbar, menu thème (routes app uniquement)
- **`InboxAccessGate`** : Vérifie l'abonnement avant d'afficher l'inbox
- **`useInboxData`** : Hook principal — debounce 300ms, pagination curseur, gestion d'erreurs
- **`useAuthUser`** : Hook d'auth — détecte le token dans l'URL, vérifie la session

### Librairies UI

- Radix UI (Dialog, Dropdown, ScrollArea, Separator)
- Lucide React (icônes)
- ECharts (graphiques)
- Sonner (toasts)
- TanStack Virtual (virtualisation des longues listes)

---

## 7. Sécurité

### Authentification
- Magic link custom (pas de mot de passe utilisateur)
- JWT Supabase (access token 1h + refresh token avec rotation)
- `crypto.getRandomValues()` pour la génération de tokens
- Tokens à usage unique, expiration 24h

### Validation des entrées
- Email : regex stricte côté frontend ET backend
- Curseur de pagination : validation UUID + ISO 8601 (anti-injection)
- Limite : clamp entre 1 et 100

### Accès aux données
- RLS (Row Level Security) sur toutes les tables
- `service_role` key uniquement côté serveur (jamais exposée au frontend)
- `anon key` pour les appels frontend (permissions limitées)
- Vérification d'abonnement dans `opportunities-search` (pas seulement RLS)

### Stripe
- Vérification de signature webhook (`STRIPE_WEBHOOK_SECRET`)
- Checkout session sécurisée côté serveur

---

## 8. Variables d'environnement

### Frontend (`.env`)
```
VITE_SUPABASE_URL          # URL du projet Supabase
VITE_SUPABASE_ANON_KEY     # Clé publique (anon)
VITE_APP_NAME              # Nom de l'app (défaut: RadarPulse)
VITE_SHOW_DEV_APP          # Afficher les features dev
```

### Edge Functions (`.env` + `supabase secrets set`)
```
SB_URL                     # URL Supabase (priorité sur SUPABASE_URL)
SERVICE_ROLE_KEY           # Clé service_role (priorité sur SUPABASE_SERVICE_ROLE_KEY)
RESEND_API_KEY             # Clé API Resend (emails)
NOTIFY_TO                  # Email admin pour notifications
NOTIFY_FROM                # Expéditeur des emails
STRIPE_SECRET_KEY          # Clé secrète Stripe
STRIPE_WEBHOOK_SECRET      # Secret de vérification webhook
OPENAI_API_KEY             # Clé API OpenAI
OPENAI_MODEL               # Modèle (gpt-4o-mini)
DEV_CALL_KEY               # Clé pour appels dev
```

---

## 9. Déploiement

### Script `DEPLOY.ps1`
1. **Secrets** : `supabase secrets set --env-file ./supabase/functions/.env`
2. **Migrations** : `supabase db push`
3. **Fonctions publiques** : deploy avec `--no-verify-jwt`
4. **Fonctions protégées** : deploy standard

### CI/CD — GitHub Actions
- **`radarpulse-15m.yml`** : Toutes les 15 minutes
  1. Appelle `dispatcher` (planifie les jobs)
  2. Boucle jusqu'à 80 itérations : fetch job → appelle worker → marque terminé
  3. Retry : 2 tentatives avec 1s de délai
  4. Timeout : 10 minutes par run
  5. Concurrence : annule les runs précédents

---

## 10. Flux de données complet

```
Sources italiennes (ANAC, RSS, HTML)
        │
        ▼ (toutes les 15 min via GitHub Actions)
    dispatcher → ingestion_jobs → worker
        │
        ▼
    opportunities_raw (contenu brut)
        │
        ▼ (GPT-4o-mini)
    opportunity_ai (extraction structurée)
        │
        ▼
    opportunities (données enrichies)
        │
        ▼ (vues SQL pré-calculées)
    opportunities_inbox_it_v1
        │
        ▼ (Edge Function opportunities-search)
    Réponse JSON paginée
        │
        ▼ (TanStack Query + useInboxData)
    Interface Inbox (React)
```

---

*Document généré le 8 mars 2026 — RadarPulse v1*
