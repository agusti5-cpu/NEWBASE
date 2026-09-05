# OPVILO Match Engine — Test Plan v0.1

These tests are the safety contract for the future Match Engine. They are intentionally data-level tests and do not modify the current NEWBASE production detector.

## Required cases

1. **Exact strong match**
   - Same normalized product/service.
   - Strong supply and demand signals.
   - Recent independent evidence.
   - Expected: high match, high confidence, low risk, `exceptional` only when viability also passes.

2. **Language/synonym match**
   - Different source-language names resolve to the same normalized entity.
   - Expected: same entity identity and comparable scoring.

3. **Country-direction match**
   - Supply in origin country and demand in destination country.
   - Expected: directional relationship preserved.

4. **Weak evidence**
   - Strong apparent match but stale or single-source evidence.
   - Expected: confidence cap; never `exceptional`.

5. **Conflicting sources**
   - Material values disagree.
   - Expected: confidence decreases and conflict is retained in evidence.

6. **High-risk opportunity**
   - Strong commercial fit but material logistical/regulatory risk.
   - Expected: risk increases and final opportunity priority is capped or blocked.

7. **Duplicate opportunity**
   - Same normalized entities, direction and commercial identity.
   - Expected: one stable identity, no duplicate publication.

8. **Stale opportunity**
   - Evidence falls outside the freshness policy.
   - Expected: score/decision reflects staleness; no automatic exceptional status.

9. **Unverified participant**
   - Candidate company cannot be sufficiently verified.
   - Expected: no automatic connection.

10. **Score boundaries**
    - 0 and 100 boundaries for every score.
    - Expected: deterministic values within range; no negative or >100 values.

11. **Explainability**
    - Every material final-score contribution has traceable evidence and a reason.
    - Expected: no unexplained material score.

12. **Determinism**
    - Same input and evidence snapshot produces the same output.
    - Expected: identical scores/status/reasons apart from explicitly time-dependent metadata.

## Quality gates

- No test should require production data or network access.
- No test should mutate NEWBASE's current detector behavior.
- Tests must fail closed: missing critical evidence must not produce a high-confidence exceptional opportunity.
- Integration with NEWBASE occurs only after these isolated tests pass.
