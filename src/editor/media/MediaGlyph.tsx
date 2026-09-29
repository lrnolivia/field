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
    >
      <rect x="2.25" y="3" width="8.5" height="7.5" rx="1" />
      <path d="M5.25 12.75h7.5a1 1 0 0 0 1-1V5.25" opacity=".72" />
      <circle cx="8.35" cy="5.55" r=".72" />
      <path d="m3.5 9.25 2.05-2.05 1.45 1.4 1.05-1.05 1.45 1.45" />
    </svg>
  );
}
