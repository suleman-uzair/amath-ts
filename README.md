# amath-ts

TypeScript port of [amath](https://github.com/plurimath/amath) — the
AsciiMath parser — on the same Parsanol PARG runtime
(`parsanol` npm package, wasm-backed).

Status: **scaffold** — port owned by @suleman-uzair.

## Contract

amath ships its grammar and checksummed artifact:

* `grammars/asciimath.parg` — the PARG source
* `artifacts/asciimath.json` + `artifacts/asciimath.checksums.txt`

amath-ts loads that artifact (vendored, pinned to an amath release tag)
and produces AsciiMath parse trees equivalent to the Ruby runtime's
(`Amath.parse`), including rejection positions.

## Conformance

Replay amath's corpora (see the amath repo `corpora/`) — tree parity with
the Ruby engine on both the native and pure-JS parsanol paths.

## Development

```sh
npm install
npm run build && npm test
```
