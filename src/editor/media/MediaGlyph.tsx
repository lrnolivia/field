import type { LoewFigmaIconProps } from '@/shared/loew-figma-icons';

/**
 * field Media glyph.
 *
 * Deliberately does not use the landscape/photo metaphor: Image keeps that
 * identity. Media represents a collection of reusable mixed media.
 */
export default function MediaGlyph({
  size = 16,
  width,
  height,
  className,
  ...props
}: LoewFigmaIconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={width ?? size}
      height={height ?? size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-label'] ? undefined : true}
      {...props}
      data-media-glyph="library"
    >
      <rect x="2.25" y="2.5" width="8.5" height="8" rx="1" />
      <path d="M5.25 13h7.25a1.25 1.25 0 0 0 1.25-1.25V5.25" opacity=".72" />
      <path d="m5.75 5.15 2.75 1.6-2.75 1.6Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
