// client/src/components/SectionDivider.jsx
//
// Subtle, premium separator placed between same-background landing sections.
// Renders a thin horizontal hairline that fades in from the edges (transparent →
// --border → transparent) with a small copper diamond centered on it. Purely
// decorative — no harsh full-width line, no large graphic, no bright color — it
// just adds quiet vertical rhythm between sections that share the page bg.
//
// Static markup (fixed tiny height) so it never causes layout shift, and it
// reads from the existing design tokens (--border, --accent) so it matches both
// light and dark themes automatically.

export default function SectionDivider({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`max-w-7xl mx-auto px-6 lg:px-8 ${className}`}
    >
      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
        <span className="w-1.5 h-1.5 rotate-45 rounded-[1px] bg-accent/30" />
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
      </div>
    </div>
  );
}
