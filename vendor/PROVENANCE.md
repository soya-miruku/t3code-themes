# Vendored files

Unmodified copies of three files from [pingdotgg/t3code](https://github.com/pingdotgg/t3code) (MIT, © 2026 T3 Tools Inc.; see [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)), taken from commit `31a9da179ed0763335f05681c577474aec5d2309` (v0.0.45):

| Here | Upstream path |
| --- | --- |
| `themePalette.ts` | `apps/web/src/themePalette.ts` |
| `themePalettes.ts` | `packages/shared/src/themePalettes.ts` |
| `vscodeThemeImport.ts` | `apps/web/src/vscodeThemeImport.ts` |

They are vendored so `build.ts` runs the same palette engine, file parser and importer detection that T3 Code ships, without needing the whole monorepo. Do not edit them. To update, re-copy from the new upstream commit, update the hash above, and rebuild.
