---
target: order card lab
total_score: 14
max_score: 20
na_heuristics: 3,5,7,9,10
p0_count: 0
p1_count: 2
target_identity: "file:/home/ross-geller/Projects/minastik/swiss-keepsakes/front-end/src/routes/lab.order-cards.tsx"
target_fingerprint: "sha256:bd250dea14e0479077ea9417e48d08085946c14d0a4969681c85c8d05980d015"
target_path: /home/ross-geller/Projects/minastik/swiss-keepsakes/front-end/src/routes/lab.order-cards.tsx
timestamp: 2026-10-13T10-58-47Z
slug: front-end-src-routes-lab-order-cards-tsx
---
Impeccable review of the order-card lab, 13 October 2026.

Two independent assessments used the seven rendered phone-width screenshots and source. The deterministic detector found zero issues across the two target files. That result does not establish usability or accessibility. No browser overlay was injected. Product behavior was not changed.

| Direction | Strength | Weakness | Verdict |
|---|---|---|---|
| F, day heading and sectioned card | Pickup-day context and complete gift lines | Place gets a whole header; guest is buried in the footer; many separators | Useful preparation information, excessive framing |
| G, daily panel | Guest and total align clearly; fewer outer containers | Permanent image column narrows all remaining content; payment wraps to three lines | Strong structure, weak use of width |
| H, day then place | Useful packing and transfer grouping | Extra headings for singleton groups; hides additional gift lines | Appropriate for a pickup run view |
| I, guest header | Fast customer identification | Redundant avatar; pickup is buried; receipt-like compartments | Suitable for guest lookup |
| J, timeline | Dates stand out | Rail consumes phone width and increases wrapping | Drop for the main merchant queue |
| A, sectioned card | Self-contained complete order information | Repeated pickup headers and tall framing | Better summary than working queue |
| D, pickup-day groups | Compact, simple, clear detail navigation | Total omitted; long product names truncated; multiple gifts compressed | Insufficient preparation information |

Priority issues. P1: competing payment and workflow emphasis. P1: summary variants hide preparation details. P2: repeated framing and date ornaments use scarce mobile space. Proposed fixes are plain payment lines, complete gift lines, and a hierarchy based on the staff task.

Design specificity. Warm light colors and product photography fit the shop, but the layouts borrow general receipt and itinerary conventions without making staff tasks dominant. Preserve the approved palette and use different compositions.

Heuristics, screenshot scope only. Status visibility 3/4, real-world match 3/4, consistency 3/4, recognition 3/4, minimalism 2/4. Control, prevention, efficiency, recovery and help are not scored because this review does not exercise the order workflow. Total 14/20.

Staff risks. New staff must infer the next task from descriptions. Preparation staff must open summarized orders to see additional products and customization. Counter staff scan more framing than necessary to identify a guest. Low-vision and enlarged-text behavior remain unverified.

Proposed K, quiet task card. A full-width compact progress line, guest and total, complete gift rows, pickup context and separate plain payment facts. Use one rounded surface and one divider. Recommended general-purpose direction.

Proposed L, pickup ticket. A narrow date column within each order, content column for guest and gift lines, place and payment below. No timeline connector. More recognizable dates with a modest width tradeoff.

Proposed M, open work list. Pickup-day headings, unboxed rows separated by rules, guest and total at top, full-width gift and status information below. Most useful density direction; order boundaries rely on spacing and rules.

Recommendation. Compare K against M first, with L as the more expressive alternative. Do not add unsupported payment collection instructions or pretend the lab sample has a real order workflow.
