# BCC Design 1.6.0 — local runtime subset

Source: https://gitlab.bcc.kz/competence-center/arcade-frontend, supplied `arcade-frontend-master.zip`, `packages/bcc-design`.

This is upstream BCC Design code, with a selected entry point, relative imports and small compatibility/accessibility fixes. It is not a replacement implementation. Archive and original file hashes are in `upstream-manifest.json`. The source monorepo declares MIT in its root package metadata. Branding assets and proprietary fonts are not bundled here.

See `../../docs/DESIGN_SYSTEM.md` for the integration, exact patches and verification. Rebuild from the app root with `npm run build:design-system`. Generated JS, CSS and declarations are checked in for reproducible use without the private registry.
