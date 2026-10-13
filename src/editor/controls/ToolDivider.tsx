// ToolDivider.tsx — Horizontal separator between sections.
// Self-hides as first-child and collapses runs of consecutive dividers via
// the [data-tool-divider]+[data-tool-divider] CSS selector.

export default function ToolDivider() {
  return (
    <div
      data-tool-divider
      // A rule again, but doing less of the work than before. Pure whitespace
      // left the sections floating with nothing to bound them; the full-width
      // hairline was the strongest single tell against the reference builder. So: still a
      // hairline, but inset further from both edges (mx-5 vs mx-3) and sitting
      // in more space, so it reads as a light punctuation mark between groups
      // rather than as the ruled-list rhythm. The eyebrow title carries the
      // rest of the grouping.
      className="h-1 bg-transparent mx-0 my-0 first:hidden [[data-tool-divider]+&]:hidden"
    />
  );
}
