# MyMusicPlayer - Code Review Notes

## Changes applied in this review copy

1. `src/App.jsx`: added `autoScanOnStartup` to the settings-store destructuring. It was referenced in the startup effect but was not declared.
2. `electron/database/connection.js`: closed the `migrations` array before iterating it. The original file had a syntax error. Also made `restoreDatabase` async because it awaits migrations, and replaced the invalid `better-sqlite3.open()` call with the constructor API.
3. `electron/ipc/handlers.js`: removed shadowed duplicate Metadata and Window handler function definitions; exported `registerFileHandlers` and `registerMetadataHandlers` so `electron/main.js` can register them; added the missing file-path ID3 read/write routes expected by the Edit Metadata page; removed duplicate library export/import channel registration; changed library export to return JSON text as expected by `ExportImport.jsx`; corrected mini-player toggle to call a local create function instead of attempting to register the same IPC handler again; corrected production mini-player file paths.
4. `electron/services/id3Service.js`: parenthesized nullish-coalescing / logical-OR expressions that are invalid JavaScript syntax.

## Validation performed

- All JavaScript files under `electron/` pass `node --check` after the changes.
- Full Vite/React production build was not verified. `npm ci` did not complete within the available environment time, and the Vite/esbuild build binaries were therefore unavailable.
- React JSX runtime behavior, SQLite migrations against a real database, audio device playback, MP3 metadata round-tripping, macOS DMG signing/notarization, and actual installation were not tested here.

## Remaining production-readiness work

- Restrict `preload.js` IPC access to an explicit allowlist of channels and validate arguments in the main process. The current generic `invoke(channel, ...args)` bridge exposes too broad an IPC surface.
- Fix and test backup/restore path handling. Verify that restoring a backup copies/restores into the app's active userData database path rather than leaving the application connected to the backup file.
- Review all audio playback error states and verify play/pause/seek/queue/repeat/shuffle/crossfade/EQ behavior with real MP3, FLAC, M4A and WAV files.
- Add a clean install/build test on the target macOS Apple Silicon machine. Verify the native `better-sqlite3` module is rebuilt for the Electron ABI and included correctly in the packaged app.
- Configure a Developer ID certificate, hardened runtime, entitlements, code signing and Apple notarization before distributing a macOS DMG outside your own machine.
- The application is an Electron desktop app with local file/database access, not a static website that can be deployed as-is to Vercel. A web-hosted version would need a separate browser-compatible architecture and user-upload/cloud-storage model.
