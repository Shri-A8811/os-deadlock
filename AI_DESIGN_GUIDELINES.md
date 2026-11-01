# Avoiding generic AI-generated web design

Research note for the OS Deadlock Analysis dashboard. Prepared 1 November 2026.

## What “AI slop” means in interface design

“AI slop” is a criticism, not a formal design or accessibility standard. In web design discussions, it usually means a polished-looking but generic, interchangeable interface that contains familiar visual patterns without making them serve the product. Recent coverage describes multiple default aesthetics rather than one definitive visual formula: one example is a warm cream background, rusty accents, large serif type, and emphatic italics; other contemporary critiques commonly point to purple/blue gradients, glowing decoration, repeated rounded cards, and generic icon sets. This disagreement is itself useful: merely swapping one trendy palette for another does not make a design specific. The defensible lesson is to define the product’s visual language and information hierarchy before generating screens, then reject choices that do not help explain the system. [The New Yorker’s report on AI design aesthetics](https://www.newyorker.com/culture/infinite-scroll/the-ai-design-aesthetic-thats-taking-over-the-internet) documents the warm palette/serif default and notes that generic instructions can produce another fixed palette rather than true variety. This is an observation about a current trend, not a usability rule.

Common clichés to watch for (subjective signals, not rules that every page must avoid):

- A fashionable gradient, glow, blur, or glass effect used as decoration without helping users understand a state.
- The same rounded, bordered card repeated for every section, even when the content is a matrix, sequence, warning, or graph that needs a different presentation.
- Generic icon/emoji decoration next to every heading or metric.
- Decorative statistics, charts, or KPI tiles that are not connected to real data or a user task.
- A landing-page hero layout or oversized marketing headline on a tool whose main job is to let students configure and inspect an algorithm.
- Motion that makes a screen look lively but does not show a meaningful state transition.
- Dense, low-contrast, tiny text used to fit too many components into one screenshot.
- A single stock dashboard template and visual hierarchy applied to every scenario, making safe, unsafe, waiting, deadlocked, and invalid appear equivalent.

These are heuristics for human review. Color, cards, gradients, icons, and animation are not inherently bad; they become poor choices when they are ornamental, repetitive, inaccessible, or disconnected from the task.

## Evidence-based design constraints

The following points are grounded in usability and accessibility guidance, rather than in the subjective “slop” label.

- **Make each screen answer a task.** Before adding a chart, card, icon, or animation, state what question it answers. Nielsen Norman Group’s chart guidance says to identify the goal and audience interpretation first, then choose a chart type and provide context, avoid clutter, and use contrast. [Choosing Chart Types: Consider Context](https://www.nngroup.com/articles/choosing-chart-types/)
- **Keep the dense interface legible through hierarchy and progressive disclosure.** A complex application need not show every control at once. Staged disclosure can expose advanced settings only when relevant; important information can stand out by removing nonessential graphics rather than adding more emphasis. [NN/g: 8 Design Guidelines for Complex Applications](https://www.nngroup.com/articles/complex-application-design/)
- **Use real data tables with semantic headers.** Allocation, Maximum, and Need are tabular data. Use table header cells (`<th>`) associated with data cells, and label tables clearly; styling alone does not give assistive technology the row/column relationships. [W3C WAI Tables Tutorial](https://www.w3.org/WAI/tutorials/tables/)
- **Do not rely on color alone.** Pair status colors with explicit words, symbols, or shapes (for example, “SAFE” and a check icon, not green alone). WCAG 2.2 says color must not be the only visual means of conveying information. [WCAG 2.2, Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
- **Maintain text contrast.** WCAG 2.2 AA requires at least 4.5:1 contrast for normal text (large text has a lower threshold). [WCAG 2.2, Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum)
- **Make controls keyboard-operable and preserve visible focus.** Step, back, play, pause, reset, scenario selection, and editable inputs should work without a mouse, with a visible focus indicator. [WCAG 2.2, Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard) and [Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible)
- **Respect reduced-motion preferences.** Keep the algorithm walkthrough, but when `prefers-reduced-motion: reduce` is set, show discrete state changes without sliding/panning or other nonessential movement. W3C lists this as a sufficient technique for animation triggered by interaction; MDN explains the media feature. [W3C: Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions) and [MDN: Using media queries for accessibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility)
- **Expose important results as text.** Graphs and diagrams need a text equivalent or nearby detailed description. The resource-allocation graph should have a textual edge/relationship list, and the Work chart should have an adjacent table or step summary. [W3C WAI: Complex Images](https://www.w3.org/WAI/tutorials/images/complex/)
- **Announce results without stealing focus.** When a request becomes “waiting,” “denied as unsafe,” or “invalid,” expose a concise status message in a programmatically determinable status region. [WCAG 2.2, Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)

## Design direction for this dashboard

Treat this as an **interactive operating-systems lab**, not a SaaS marketing page. The interface should make resource state and algorithm reasoning the visual identity. A restrained neutral surface with a small, purposeful status palette is a reasonable starting point, but the exact colors and type should be selected for legibility and the team’s own rationale rather than because a generator defaults to them.

### Information architecture

- Put the current scenario and its status near the top. Use explicit labels: **Safe**, **Unsafe**, **Waiting / Deferred**, **Deadlock Detected**, and **Invalid Input**. Explain that unsafe is not synonymous with deadlocked.
- Separate **Avoidance**, **Detection**, and **Prevention / Recovery** into distinct views or clearly separated workspaces, consistent with the assignment.
- Put editable process/resource counts, Allocation, Maximum, and Available values beside or immediately before the results they control. Keep Need visible as a calculated, read-only matrix so students can explain `Need = Maximum − Allocation`.
- Provide a small set of meaningful example scenarios and a reset action. Avoid fake live telemetry or metrics that imply the app is monitoring a real OS.
- Let secondary theory or input validation detail expand when needed, instead of crowding every screen with paragraphs.

### Data display and animation

- Use semantic tables for Allocation, Maximum, and Need. Keep process/resource headers fixed in meaning and show units/labels; visibly identify which cells changed in the current step.
- Use the Work chart only to show the sequence of resource availability. Label each step/process and show exact values on the chart or beside it; keep a table of the same trace as a nonvisual and copyable equivalent.
- Draw the resource-allocation graph as a directed graph with a legend that explains process nodes, resource nodes, request edges, assignment edges, and resource-instance counts. Distinguish edge types by labels/patterns as well as color. Show the assumptions for single-instance versus multiple-instance resources alongside the result.
- Animate only algorithm events: a process becomes runnable, finishes, releases its allocation, Work increases, or a request is temporarily applied and then rolled back. Highlight the changed row, node, or edge, and show the matching explanation and vector values. Avoid unrelated counters, bouncing, parallax, ambient particle motion, and animation that hides a result.
- Provide **Back**, **Next**, **Play/Pause**, and **Reset** controls. Keep the current step number and a short textual explanation visible. Autoplay should not be the only way to follow the algorithm; reduced-motion settings should switch it to immediate step changes.
- For an unsafe request, make the temporary state and rollback explicit. For a request exceeding Available, label it deferred/waiting and preserve the current allocation. Use result copy and visual treatments that keep these meanings distinct.

### Visual craft and review

- Choose one visual signature tied to OS concepts (for example, an orderly process/resource map and clear matrix highlighting) rather than relying on a trendy gradient or a generic set of dashboard cards.
- Use cards only where grouping helps. A matrix should read as a matrix, a step sequence as a timeline/list, a graph as a graph, and a warning as a status message; do not put every one in identical card shells.
- Use a small consistent type scale, adequate text size, deliberate spacing, and restrained borders. Do not use low contrast or tiny type to force everything above the fold.
- Use icons only when they clarify a state or control; label icon-only controls accessibly. Avoid emoji as decoration.
- Review realistic safe, waiting, unsafe, deadlock, prevention, and invalid cases. Ask a teammate who did not build a screen to explain what the result means without coaching. If they cannot distinguish the states or explain what changed in a step, revise the hierarchy and labels.

## Build checklist

- [ ] Every visual element answers a named question about the process/resource state or the algorithm.
- [ ] Avoid a default template look: repeated cards, decorative gradient/glow, generic icon grids, filler statistics, or a hero that competes with the simulator.
- [ ] Safe, unsafe, waiting/deferred, deadlocked, and invalid are distinguishable by words and more than color alone.
- [ ] Need is calculated and visible; the safety trace shows Work before and after each completed process.
- [ ] Resource graph labels edge direction/type, resource multiplicity, and model assumptions; results are also available in text.
- [ ] Animation is an accurate view of the algorithm trace, has step controls, and respects reduced motion.
- [ ] Tables use semantic headers; controls are keyboard-operable with visible focus; status changes can be announced.
- [ ] Text contrast and chart/graph labels remain legible in the chosen theme.
- [ ] No fake metrics, decorative live-data cues, or results that have not been computed from the current scenario.
- [ ] A teammate can interpret the interface and explain a scenario without relying on color or autoplay.

## Source note

The phrase “AI slop” and lists of visual tells are subjective and shift over time. The design constraints above therefore separate (1) media/design discourse about generic AI aesthetics from (2) formal WCAG requirements and usability guidance. Avoiding clichés does not mean avoiding any one color, font, or UI component; it means choosing them for a specific task and verifying that they make the system easier to understand.
