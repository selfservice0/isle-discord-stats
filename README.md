# The Isle stats viewer

Static GitHub Pages viewer for the IsleDiscordChat UE4SS mod. Publish this folder's `index.html`, `style.css`, `viewer.mjs` and `.nojekyll` at the root of a GitHub Pages repository. It has no server code, analytics, external scripts, API credentials or upload endpoint.

The mod puts a versioned, compressed snapshot in a URL fragment (`#is1.…`). The viewer decodes it in the browser and renders text safely using DOM text nodes. The fragment is not part of the HTTP request to GitHub. Anyone with the complete link can read the snapshot; this is not an authenticated report or proof that someone did not edit the link.

The format is a JSON array: `[1, server, eventKind, serverLogTime, deathCause, players]`. Each player is `[name, SteamID64, dinosaur, normalizedGrowth, statsOrNull]`. Stats contain `[ageSeconds, numericValues, flags, sex, effects, mutationGroups]`. Numeric/flag order is defined in `native/page.hpp`; there are 19 numeric values, 9 flags, 5 effects, and 4 groups of 4 mutation slots. Null means unavailable, never zero. All four mutation groups preserve slot numbers.

UTF-8 JSON is compressed with LZSS: flag bytes represent up to eight low-bit-first tokens. A zero flag is one literal byte. A one flag is a two-byte big-endian token with 12 high bits for distance minus one and 4 low bits for length minus three. Distance is 1–4096; length is 3–18; overlapping references are permitted. Compressed bytes use unpadded base64url. The decoder rejects invalid references, incomplete data, invalid UTF-8, unsupported schemas and output above 32 KiB.

The sender includes a single inline Stats link only when the entire Discord message fits 2,000 UTF-16 units. Otherwise it sends a complete text attachment in the same webhook request instead of dropping fields or truncating a hyperlink. No snapshot is committed to GitHub per event.

Use `#demo` for a clearly labelled fictional example. A plain URL displays instructions; malformed links display an error. The layout stacks the two player cards on small screens. No bot is needed.
