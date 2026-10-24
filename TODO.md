# amath-ts port checklist (suleman-uzair)

1. [ ] Vendor the amath artifact: grammars/asciimath.parg + artifacts/
       ascimath.json + checksums from a pinned amath tag (add a sync script)
2. [ ] Runtime load via the parsanol npm package (wasm), checksum verified
3. [ ] Tree parity: Amath.parse (Ruby) vs amath-ts on the amath corpora —
       same trees, same rejection offsets (byte + char)
4. [ ] Decimal-marker configuration parity (dot/comma/arabic)
5. [ ] Engine fallback parity: native-engine recursion limits vs the Ruby
       engine's deep-nesting path (amath PR #10)
6. [ ] npm publish @plurimath/amath-ts (trusted publishing via OIDC)

Reference: plurimath/amath lib/amath (runtime, errors, engine policy) and
its grammars/artifacts.
