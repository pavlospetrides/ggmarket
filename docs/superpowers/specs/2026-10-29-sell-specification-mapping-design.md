# Sell Specification Mapping Repair

## Intent

Specification values must retain their category meaning from entry through preview, draft/edit restoration, API validation, storage, and published detail. A free-text Gaming PC RAM value such as `16` must never be relabeled using the Games PEGI option table.

## Root-cause boundary

The taxonomy currently builds one global option lookup keyed only by raw value. Because PEGI owns the option value `16`, every string value `16` is formatted as `PEGI 16`, even when its stable field identifier is `ram`. Form state, payload construction, and Supabase JSON preserve the correct key/value; corruption occurs during display formatting in both preview and published detail.

## Design

- Resolve labels and option values from the selected category schema and current structural attributes.
- Treat text fields as seller-entered text; never run them through another field's option labels.
- Keep structural identifiers such as platform and console model human-readable through their own stable-key maps.
- Render PEGI only for the `pegi` field.
- Continue using `buildListingTaxonomyAttributes` as the category-isolation boundary so category changes discard known incompatible fields while preserving unrelated legacy metadata.
- Do not migrate or rewrite existing listing rows. Correctly stored existing values should render correctly after deployment.

## Verification

Unit tests cover schema-specific formatting and every configured category. Browser tests exercise the complete six-step Gaming PC and Games flows, category switching, captured publish payloads, preview values, and the read-only edit harness. API integrity tests continue proving that invalid cross-category keys are rejected and valid draft/edit attributes are preserved.
