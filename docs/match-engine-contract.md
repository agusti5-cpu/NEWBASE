# OPVILO Match Engine — Data Contract v0.1

## Purpose

Define the stable interface between NEWBASE opportunities and the future OPVILO global matching layer. This document is design-only: it does not change the production detector.

## Pipeline

`NEWBASE opportunity -> normalization -> offer/demand -> match -> scores -> evidence -> risk -> decision`

## Core object

```json
{
  "matchId": "stable-id",
  "offer": {
    "opportunityId": "newbase-opportunity-id",
    "entityId": "normalized-entity-id",
    "country": "ES",
    "productOrService": "normalized-product-or-service"
  },
  "demand": {
    "opportunityId": "newbase-opportunity-id",
    "entityId": "normalized-entity-id",
    "country": "JP",
    "productOrService": "normalized-product-or-service"
  },
  "scores": {
    "match": 0,
    "confidence": 0,
    "viability": 0,
    "risk": 0,
    "opportunity": 0
  },
  "evidence": [],
  "reasons": [],
  "status": "candidate"
}
```

## Score semantics

- `match`: commercial fit between supply and demand (0–100).
- `confidence`: reliability and recency of the underlying evidence (0–100).
- `viability`: commercial/logistical feasibility where evidence exists (0–100).
- `risk`: exposure to material uncertainty or restrictions (0–100; higher is worse).
- `opportunity`: final prioritisation score derived from the other dimensions, never presented as certainty.

## Evidence requirements

Each material score contribution should be traceable to one or more sources. Evidence should record source, observed value, observation date, and interpretation type (`data`, `inference`, or `derived`). Conflicting sources reduce confidence rather than being silently resolved.

## Statuses

- `candidate`: structurally valid, not yet fully scored.
- `watch`: interesting but insufficient evidence or score.
- `priority`: high-quality match suitable for deeper enrichment.
- `exceptional`: very strong match, confidence and viability with acceptable risk.
- `rejected`: duplicate, stale, unverifiable, incompatible, or otherwise below publication/connection thresholds.

## Safety and quality gates

A high match score alone must not produce an exceptional opportunity. Low confidence, high risk, stale evidence, or an unverified participant must cap or block the final decision.

## Compatibility

The contract is intentionally additive and versionable. NEWBASE remains the source of detected opportunities; the future Match Engine consumes those records without requiring the existing detector to know about matching, company discovery, connection, or monetisation.
