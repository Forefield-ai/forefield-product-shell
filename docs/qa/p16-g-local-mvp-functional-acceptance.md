# P16-G Local MVP 0.1 Functional Acceptance

## Environment

- Repo: `forefield-product-shell`
- Reference repo status: `forefield-decision-core` clean at acceptance start
- Local app command: `npm run dev -- --host 127.0.0.1`
- Local URL: `http://127.0.0.1:5173/`
- Browser: Codex in-app browser
- Acceptance mode: functional demo QA only, not visual acceptance
- Live provider/source fetch: not run

## Functional Checklist

| Check | Result | Notes |
| --- | --- | --- |
| App loads | Pass | Local Vite app loaded at `http://127.0.0.1:5173/`. |
| Grouped evidence sample selectable / loaded | Pass | Development Preview selector exposed `Grouped evidence review snapshot` and selected it successfully. |
| Workspace renders | Pass | Local topic flow reached Topic Workspace without crashing. |
| Review summary visible | Pass | Initial review summary rendered with cluster/evidence/source metrics. |
| Cluster list visible | Pass | Cluster list rendered grouped and fallback clusters. |
| Grouped cluster visible | Pass | `Manual cleanup before sharing AI meeting notes` rendered with grouped preview counts. |
| Fallback cluster visible | Pass | `Fallback cluster keeps flat v0.2 evidence behavior` rendered separately. |
| Evidence Drawer opens | Pass | Grouped cluster drawer opened from `View Evidence`. |
| Direct Support section visible | Pass | Grouped drawer displayed Direct Support. |
| Counter Evidence section visible | Pass | Grouped drawer displayed Counter Evidence. |
| Discovery Leads section visible | Pass | Grouped drawer displayed Discovery Leads as its own grouped section. |
| Other grouped sections visible | Pass | Weak Support, Trend Context, Competitive Context, and Professional Context appeared as grouped sections. |
| Discovery Leads not represented as direct evidence | Pass | Grouped preview and brief markdown kept Discovery Leads separate and caveated as follow-up leads, not evidence. |
| Fallback drawer behavior works | Pass | Fallback cluster drawer showed flat evidence behavior without grouped sections. |
| Baseline Brief Preview opens | Pass | `Preview Brief` opened the existing Baseline Brief preview. |
| Markdown visible / copyable | Pass | Read-only copyable markdown area appeared in the preview. |
| Required caveats visible in brief | Pass | Markdown included discovery lead, trend context, competitive context, direct evidence count, and counter evidence caveats. |
| No raw/private/source/provider fields visible | Pass | Browser DOM snapshots showed no URL pattern or raw/private/provider text during workspace, drawer, and brief checks. |
| Browser console clean | Pass | No warnings or errors were reported by the in-app browser log check. |

## Go / No-go Result

`go_for_local_functional_demo`

The current product-shell is functionally acceptable for an MVP 0.1 local demo walkthrough using controlled fixture data.

## What User Can Do

- Select the grouped evidence sample.
- Create a local demo topic.
- Reach the Topic Workspace.
- Inspect Review Summary and Signal Cluster list.
- Open grouped Evidence Drawer sections.
- Inspect v0.2 fallback drawer behavior.
- Open Baseline Brief Preview.
- Copy or inspect the safe markdown draft.

## Known Limitations

- Fixture data only.
- No source-live validation.
- No runtime default v0.3 emission.
- No auth/API/persistence.
- No final visual design.
- No PDF/share export.
- No Figma implementation.
- Browser acceptance was functional and DOM-oriented, not visual-regression coverage.

## Screenshots

Screenshots were not committed. The manual acceptance pass used live browser DOM inspection to avoid adding image artifacts and to avoid committing any accidental raw/private/source/provider data.

## Validation Commands

- `npm run validate`
- `npm test`
- `npm run build`
- `git diff --check`

All validation commands passed. `git diff --check` reported no whitespace errors.

## Technical Debts

- `local_demo_flow_uses_fixture_data`
- `source_live_validation_deferred`
- `runtime_review_handoff_v03_default_emission_not_implemented`
- `generated_fixture_refresh_for_v03_not_completed`
- `baseline_brief_visual_design_not_done`
- `final_figma_design_not_started`
- `product_shell_grouped_evidence_drawer_visual_design_not_done`
- `mvp_auth_api_persistence_not_implemented`
- `local_functional_demo_manual_qa_completed`

## Next Recommended Phase

Proceed to MVP 0.1 release-readiness packaging or a narrow product acceptance checklist. Defer final visual design, Figma implementation, source-live validation, and runtime v0.3 default consumption until after the functional demo is accepted.
