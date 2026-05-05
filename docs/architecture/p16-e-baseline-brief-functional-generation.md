# P16-E Baseline Brief Functional Generation

## Executive Decision

P16-E adds functional Baseline Brief generation from the existing Topic Workspace view state and grouped evidence read-model. This is not final report design, not an LLM prose generator, and not a runtime v0.3 contract switch.

The implementation keeps v0.2 workspace behavior intact while adding a copyable markdown draft that can use additive v0.3-like grouped evidence when present.

## Why P16-E Follows P16-D

P16-D proved the local workspace can load a grouped evidence fixture, expose grouped evidence through TopicWorkspace view state, render grouped Evidence Drawer sections, preserve the SignalClusterCard preview, and fall back to v0.2 flat evidence.

P16-E uses that same view-state path as the source of truth for a functional brief draft.

## Brief Source

The brief is generated from:

- `TopicWorkspace` view state.
- Evidence drawer states keyed by cluster id.
- The existing baseline brief eligibility state.
- The grouped evidence read-model from P16-C/D.

It does not import decision-core code and does not require generated artifact refresh.

## Markdown Structure

The copyable markdown draft uses this functional structure:

- `# Baseline Brief`
- `## Topic`
- `## Review Summary`
- `## Key Signal Clusters`
- `## Evidence Highlights`
- `## Caveats`

The output is plain markdown text suitable for copy/paste or later replacement by a designed report surface.

## Evidence Semantics

Grouped evidence sections are preserved as separate roles:

- Direct Support is treated as direct evidence.
- Weak Support is directional only.
- Trend Context is context, not proof of user demand.
- Competitive Context is market/vendor context, not user demand evidence by itself.
- Professional Context is context unless later validated elsewhere.
- Counter Evidence is preserved separately and is not counted as direct support.
- Discovery Leads are follow-up leads, not evidence yet.

## Direct Evidence Counting Policy

The brief direct evidence count only includes Direct Support. Trend Context, Discovery Leads, Competitive Context, Professional Context, Weak Support, and Counter Evidence do not inflate direct evidence.

For v0.2 fallback clusters without grouped evidence, flat evidence can appear as Direct Support fallback, but source URLs are omitted from the copyable markdown draft.

## Counter Evidence Handling

Counter Evidence has a dedicated summary path and dedicated markdown section. It is not hidden inside support language and is not counted as direct support.

## Discovery Lead Caveat

Every generated brief includes the caveat:

- Discovery leads are not evidence yet.

This keeps the P15 Google Forum snippet boundary intact in the product shell.

## v0.2 Fallback Behavior

When grouped evidence is absent:

- Brief generation still succeeds.
- `fallbackMode` is marked true.
- Flat evidence summaries can populate Direct Support fallback.
- Grouped sections are not invented.
- Source links remain omitted from the copyable markdown.

## UI Preview Behavior

The existing Baseline Brief preview now receives the grouped-evidence-aware brief view state and shows a read-only copyable markdown draft. The surrounding preview and workspace controls remain functionally unchanged.

This phase intentionally avoids final visual treatment, rich editing, export, sharing, and Figma design.

## What Remains Deferred

- final report design
- Figma design
- PDF export
- share links
- rich editor
- LLM-generated prose
- runtime default v0.3 consumption
- API/persistence/auth
- source-live validation
