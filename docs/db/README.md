# RadarPulse — Documentation Base de Données

Ce dossier est généré automatiquement.

## Fichiers

- `schema_snapshot.sql`  
  Dump DDL (schema-only) du/des schemas ciblés.

- `SCHEMA_CANONIQUE.md`  
  Vue lisible du schéma : tables + colonnes, indexes, RLS policies, triggers, views, fonctions, enums.

## Génération locale (Ubuntu/WSL)

Prérequis :
- Docker
- Une variable d’environnement `DATABASE_URL`

Exemple :

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require"
export SCHEMAS="public"
./scripts/db/update-db-docs.sh
