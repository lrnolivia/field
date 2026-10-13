/** A collection layout, distinct from Media's image glyph. */
export default function GalleryGlyph({ size = 14, className }: { size?: number; className?: string }) {
  return <svg className={className} data-gallery-glyph aria-hidden viewBox="0 0 20 20" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="14" height="14" rx="2" />
    <path d="M10 3v14M3 10h7M10 7h7M10 12h7" />
  </svg>;
}
