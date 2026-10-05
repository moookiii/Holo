# Binder cold loading

Card preparation overlaps full-resolution image decoding, mask packing and foil
generation with the preceding card's GPU work. A bounded three-card lookahead
keeps the visible spread ahead of neighboring pages. The first card starts alone
while page materials prepare, so later foil jobs do not delay its initial work.
GPU uploads, compilation and attachment remain sequential and honor motion pauses.

CPU manufacturing fields use up to three lazily created workers, limited to half
the reported hardware concurrency. The generator, seeds, dimensions and returned
pixels are unchanged. Independent mask images load concurrently. Failures from
speculative preparation are observed immediately and reported when the slot is
reached; navigation cancellation still uses the existing shared-cache retry.

Viewer cache lookup and CPU preparation now use the same key, including reverse
profiles and maps. A complete-definition comparison still rejects incompatible
cached cards. This avoids decoding, packing and generating the same binder card
again when opening its full-quality viewer.

## Verification

Run `node scripts/binder-cold-load-check.mjs` against a local dev server. Set
`BINDER_URL` to select another URL or backend. Each run starts a fresh browser
context, measures the first card, full visible spread and neighbor readiness,
verifies viewer CPU-cache reuse, opens a real card, then interrupts preparation
and reopens the binder. Reports and screenshots go to
`artifacts/favorites-binder/`. Run benchmarks without competing browser tests.

On the development machine, the initial 73-favorite WebGPU baseline took 20.0 s
for the visible 24-card spread and 57.0 s for all 60 resident cards. The optimized
run took 14.4 s and 35.3 s respectively. Subsequent runs varied with machine load
(15.5-17.9 s visible, 39.6-43.0 s including neighbors). First-card latency stayed
around 6-7 s. A prepared binder card opened in the viewer in 331 ms with one GPU
realization and zero CPU rebuilds. These are local measurements, not timing
guarantees for every card, device or network.

Texture dimensions, filtering, material profiles, geometry and shader effects
are unchanged. The baseline and optimized 60-card runs retained the same GPU
bytes and texture/material counts. The existing motion check also passed with
zero new pipelines or textures during page lift and fourteen page turns.
