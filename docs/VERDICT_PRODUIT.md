# Verdict produit — RadarPulse

## Ce que RadarPulse est dans ce ZIP

RadarPulse est déjà un produit structuré, avec :
- un socle d'ingestion
- un worker
- des connecteurs source
- une canonisation opportunité
- une recherche inbox
- un brief IA persistant serveur
- une décision persistée serveur
- un début de lineage agentique en base

## Ce que RadarPulse n'est pas encore

RadarPulse n'est pas encore un vrai système multi-agent métier.

Il n'y a pas encore :
- d'orchestration multi-agent complète
- de mémoire dossier unifiée exposée produit
- de moteur de scoring structuré
- d'agent préparation
- d'agent deadline/follow-up
- de workflow multi-états complet côté UI

Le produit est en phase **fondation + premières briques agentiques**, pas au niveau "multi-agent opérationnel".

---

## 1. Lecture objective du front

Le cœur produit métier visible est surtout :
- `apps/web/src/features/inbox/InboxPage.tsx`
- `useInboxData.ts`
- `useOpportunityBrief.ts`
- `useDecisions.ts`

### Ce que l'inbox fait réellement

L'inbox permet :
- charger une liste d'opportunités
- filtrer par recherche / statut / qualité
- ouvrir un détail
- générer un brief IA
- prendre une décision GO / HOLD / NO_GO

L'UX actuelle couvre :

> veiller → lire → décider

Pas encore :

> veiller → enrichir → scorer → décider → préparer → suivre

### Limite front majeure

Il manque encore dans l'UX :
- historique du dossier
- timeline des événements
- score structuré
- tasks/checklist
- documents requis reliés au dossier
- suivi opérationnel
- ownership / équipe

---

## 2. Lecture objective de la DB / backend

### Tables présentes

| Couche | Tables |
|--------|--------|
| Source | `sources`, `ingestion_jobs`, `ingestion_runs` |
| Brute | `opportunities_raw` |
| Canonique | `opportunities` |
| Enrichie | `opportunity_ai`, `opportunity_ai_evidence`, `opportunity_documents` |
| Agentique / mémoire | `agent_runs`, `brief_versions`, `decision_history`, `opportunity_scores`, `opportunity_extractions` |
| Produit utilisateur | `opportunity_briefs`, `opportunity_decisions` |

La DB est déjà orientée vers un système agentique, même si le front n'exploite pas encore tout.

---

## 3. Ce que le backend fait réellement

### Pipeline ingestion
- dispatcher → worker → connecteurs → raw upsert → opportunity upsert → AI extract light

### Brief agent (`opportunity-brief`)
- vérifie un cache DB TTL 7 jours dans `opportunity_briefs`
- appelle OpenAI si absent
- persiste le brief
- écrit un `agent_run`
- écrit un `brief_versions`
- maintient le `is_current`
- garde un `input_snapshot`

### Decision agent (`opportunity-decision`)
- authentifie l'utilisateur
- écrit ou supprime dans `opportunity_decisions`
- journalise dans `decision_history`
- rollback si l'historique échoue

---

## 4. Fondations multi-agent présentes

| Brique | État |
|--------|------|
| Ledger d'exécution (`agent_runs`) | Présent |
| Versioning brief (`brief_versions`) | Présent |
| Historique de décision (`decision_history`) | Présent |
| Séparation raw / canonical / enriched | Présente |

---

## 5. Ce qui manque encore

### 5.1 Pas d'orchestrateur métier multi-agent
Pas de chaîne : détection → enrichissement → scoring → recommandation → préparation → suivi deadline → relance

### 5.2 Pas de moteur de scoring décisionnel
Pas de :
- fit score, effort score, urgency score
- risk level, strategic relevance
- recommandation GO/HOLD/NO_GO calculée

### 5.3 Pas d'agent préparation
Pas de module qui génère checklist, documents manquants, charge estimée, blocages, plan de réponse.

### 5.4 Pas d'agent deadline/follow-up
Deadline affichée, mais pas d'agent structuré qui priorise, remonte les trous, pousse la prochaine action.

### 5.5 Pas de workspace dossier unifié
Pas d'objet UX fort du type : overview · timeline · état · brief · score · décision · checklist · documents · événements · commentaires · ownership

---

## 6. Décalage front vs DB

La DB est en avance sur le front.

> Tu as déjà une partie du "moteur", mais pas encore le "cockpit".

---

## 7. État réel vs idée multi-agent

| Couche | État |
|--------|------|
| Surveillance / ingestion | Présent |
| Enrichissement light | Présent |
| Brief analytique | Présent |
| Décision persistée | Présente |
| Ledger d'exécution | Présent |
| Mémoire de travail | Partielle |
| Scoring | Schéma OK, produit absent |
| Historique riche | DB OK, peu exposé front |
| Préparation | Absent |
| Follow-up deadline | Absent |
| Orchestration complète | Absente |
| Cockpit dossier | Absent |

---

## 8. Évaluation de maturité

| Dimension | Score |
|-----------|-------|
| Socle ingestion | 7/10 |
| Modèle canonique + DB | 7.5/10 |
| Brief IA | 7/10 |
| Décision workflow | 6.5/10 |
| Front métier | 5/10 |
| Multi-agent réel | 3.5/10 |

---

## 9. Ordre de construction recommandé

### Phase 1 — Verrouiller le noyau
1. Stabiliser l'opportunité canonique
2. Fiabiliser l'ingestion source
3. Brancher `opportunity_extractions` comme vérité enrichie courante
4. Exposer `opportunity_briefs` + `brief_versions` en produit

### Phase 2 — Rendre la décision intelligente
5. Activer un vrai moteur `opportunity_scores`
6. Afficher score + rationale + confidence côté front
7. Relier décision, brief et score dans un même écran dossier

### Phase 3 — Faire naître le dossier vivant
8. Créer un **Opportunity Workspace** unique avec : résumé · extraction courante · score courant · décision courante · timeline · documents · events · next actions

### Phase 4 — Passer au vrai agentic métier
9. Agent préparation
10. Agent deadline/follow-up
11. Triggers entre agents
12. Orchestration explicite

---

## 10. Ce qu'il ne faut pas faire trop tôt

Partir directement sur 6 agents avancés, competitor intelligence, partner fit, draft complet de réponse ou orchestrateur complexe serait une erreur.

**Sans cockpit dossier et scoring exploitable, les agents tourneraient sur une base encore trop peu visible produit.**

---

## Conclusion

> RadarPulse, dans ce ZIP, est un produit de veille/intelligence opportunité déjà très bien structuré, avec les premières briques d'un futur système multi-agent, mais pas encore un véritable orchestrateur agentique métier.

**Le prochain vrai pas** : transformer l'opportunité en dossier vivant unique, puis brancher score, décision, préparation et suivi autour de ce dossier.
