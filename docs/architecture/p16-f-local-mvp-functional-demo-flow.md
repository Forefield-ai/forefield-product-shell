# P16-F Local MVP 0.1 Functional Demo Flow

## Executive Decision

P16-F validates a local MVP 0.1 functional demo flow using existing product-shell fixtures. This phase is functional QA only. It is not final visual design, not Figma implementation, not runtime v0.3 default consumption, and not source-live validation.

The demo flow is ready for a manual walkthrough with the grouped evidence sample while preserving v0.2 fallback behavior.

## What P16-F Validates

The functional demo flow proves that a local user can:

- select the grouped evidence sample in development preview controls.
- load the Topic Workspace without crashing.
- inspect Review Summary and Signal Cluster list state.
- see grouped evidence preview counts on a grouped cluster.
- open the grouped cluster Evidence Drawer.
- inspect Direct Support, Counter Evidence, Weak Support, Trend Context, Competitive Context, Professional Context, and Discovery Leads separately.
- inspect a fallback cluster without grouped evidence.
- open the Baseline Brief preview.
- use the copyable markdown draft generated from workspace state.
- keep direct evidence, counter evidence, discovery lead, and trend-context semantics intact.

## Local User Flow

1. Open product-shell locally.
2. Select `Grouped evidence review snapshot` from the development sample selector.
3. Create or open a local topic through the standard prototype flow.
4. Confirm the Topic Workspace loads.
5. Confirm Review Summary and the cluster list render.
6. Confirm one grouped cluster and one fallback cluster exist.
7. Open the grouped cluster Evidence Drawer.
8. Confirm Direct Support, Counter Evidence, and Discovery Leads appear as separate sections.
9. Confirm Discovery Leads are labeled as follow-up leads, not evidence yet.
10. Open the fallback cluster drawer.
11. Confirm flat evidence fallback still works.
12. Open Baseline Brief preview.
13. Confirm markdown contains Topic, Review Summary, Key Signal Clusters, Evidence Highlights, and Caveats.
14. Confirm copyable markdown exists.
15. Confirm no raw/private/source URLs are visible.
16. Treat visual design as out of scope for this phase.

## Fixture Dependency

The flow uses `grouped-evidence-product-mainline.sample.json`. It is synthetic, sanitized, local-only fixture data. It contains one grouped cluster and one non-grouped fallback cluster.

The v0.2 fallback check uses the existing minimal product mainline fixture.

## Why This Is Not Final Visual Design

The current UI remains intentionally functional. P16-F does not introduce a new design system, decorative styling, animations, final Evidence Drawer layout, or final report presentation.

## Why This Is Not Source-live Validation

The flow does not call live providers, source APIs, scraping paths, or source-fetch adapters. It validates local product-shell consumption of controlled fixture data only.

## Acceptance Checklist

- grouped sample can be selected.
- workspace view state builds.
- Review Summary and cluster list state exist.
- grouped cluster exposes grouped evidence preview counts.
- grouped Evidence Drawer exposes grouped sections.
- fallback cluster uses flat evidence behavior.
- Baseline Brief view state builds.
- copyable markdown is available.
- markdown includes required sections.
- discovery leads are caveated as not evidence.
- trend context is caveated as not proof.
- counter evidence is preserved.
- direct evidence count remains strict.
- raw/private/source/provider fields are absent from state and markdown.
- v0.2 fallback remains intact.
- browser build passes.

## Known Limitations

- The demo uses fixture data.
- Source-live validation remains deferred.
- Runtime v0.3 default emission is not enabled.
- Generated v0.3 fixtures are not refreshed.
- Baseline Brief visual design is not done.
- Final Figma design has not started.
- Grouped Evidence Drawer visual design is not done.
- Auth, API, and persistence are not implemented.

## Deferred Work

- source-live validation
- runtime ReviewHandoff v0.3 default emission
- generated fixture refresh for v0.3
- final Baseline Brief design
- Figma-based visual implementation
- grouped Evidence Drawer visual polish
- API, auth, and persistence

## Next Recommended Phase

P16-G should be a product acceptance and release-readiness pass for the local MVP 0.1 demo, focused on manual QA evidence, smoke checks, and a clear go/no-go list before visual design or runtime v0.3 default work.
