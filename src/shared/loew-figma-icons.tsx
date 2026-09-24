// loew-figma-icons.tsx
//
// A compact, coherent thin-line icon family for Revyme editor chrome.
// These are original geometric redraws inspired by Figma UI3's visual weight;
// no Figma proprietary vector assets are copied.

import React from 'react';

export type LoewFigmaIconProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
};

type BaseProps = LoewFigmaIconProps & {
  children: React.ReactNode;
  filled?: boolean;
};

function IconBase({
  size = 16,
  width,
  height,
  children,
  className,
  filled = false,
  ...props
}: BaseProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={width ?? size}
      height={height ?? size}
      className={`loew-figma-icon${className ? ` ${className}` : ''}`}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={filled ? undefined : 1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-label'] ? undefined : true}
      {...props}
    >
      {children}
    </svg>
  );
}

export const FigmaPlusIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}><path d="M8 3.5v9M3.5 8h9" /></IconBase>
);

export const FigmaReloadIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <path d="M12.6 5.4A5.2 5.2 0 1 0 13 9" />
    <path d="M10.2 3.6h2.7v2.7" />
  </IconBase>
);

export const FigmaSearchIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <circle cx="7" cy="7" r="4" />
    <path d="m10 10 3 3" />
  </IconBase>
);

export const FigmaChevronDownIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}><path d="m5 6.5 3 3 3-3" /></IconBase>
);

export const FigmaChevronRightIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}><path d="m6.5 5 3 3-3 3" /></IconBase>
);

export const FigmaCheckIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}><path d="m3.5 8.2 2.7 2.7 6.3-6.3" /></IconBase>
);

export const FigmaCloseIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}><path d="m4.5 4.5 7 7m0-7-7 7" /></IconBase>
);

export const FigmaMoreIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <circle cx="4" cy="8" r=".7" fill="currentColor" stroke="none" />
    <circle cx="8" cy="8" r=".7" fill="currentColor" stroke="none" />
    <circle cx="12" cy="8" r=".7" fill="currentColor" stroke="none" />
  </IconBase>
);

export const FigmaCursorIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <path d="M3.1 2.5 12.4 8l-4 .9L6.6 13z" />
  </IconBase>
);

export const FigmaFrameIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" />
  </IconBase>
);

export const FigmaTextIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <path d="M3 4V2.8h10V4M8 3v10M6.2 13h3.6" />
  </IconBase>
);

export const FigmaHandIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <path d="M5.4 8V4.4a1 1 0 0 1 2 0V7M7.4 7V3.7a1 1 0 0 1 2 0V7M9.4 7V4.3a1 1 0 0 1 2 0v3.1M11.4 7.4V5.5a1 1 0 0 1 2 0v3.2c0 3-1.8 4.8-4.5 4.8H8c-1.6 0-2.7-.7-3.6-1.8L2.8 9.6a1 1 0 0 1 1.5-1.3l1.1 1.2" />
  </IconBase>
);

export const FigmaCommentIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <path d="M3 3.5h10v7H7.5L4.5 13v-2.5H3z" />
  </IconBase>
);

export const FigmaPlayIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}><path d="m5.5 3.5 7 4.5-7 4.5z" /></IconBase>
);

export const FigmaSunIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <circle cx="8" cy="8" r="2.5" />
    <path d="M8 1.8v1.4M8 12.8v1.4M1.8 8h1.4M12.8 8h1.4M3.6 3.6l1 1M11.4 11.4l1 1M12.4 3.6l-1 1M4.6 11.4l-1 1" />
  </IconBase>
);

export const FigmaMoonIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <path d="M11.8 10.8A5.1 5.1 0 0 1 5.2 4.2 5.5 5.5 0 1 0 11.8 10.8Z" />
  </IconBase>
);

export const FigmaRowsIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <rect x="2.5" y="3" width="11" height="4" rx=".8" />
    <rect x="2.5" y="9" width="11" height="4" rx=".8" />
  </IconBase>
);

export const FigmaColumnsIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <rect x="3" y="2.5" width="4" height="11" rx=".8" />
    <rect x="9" y="2.5" width="4" height="11" rx=".8" />
  </IconBase>
);

export const FigmaGridIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <rect x="2.5" y="2.5" width="4.5" height="4.5" rx=".7" />
    <rect x="9" y="2.5" width="4.5" height="4.5" rx=".7" />
    <rect x="2.5" y="9" width="4.5" height="4.5" rx=".7" />
    <rect x="9" y="9" width="4.5" height="4.5" rx=".7" />
  </IconBase>
);

export const FigmaSquareIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}><rect x="2.75" y="2.75" width="10.5" height="10.5" rx="1" /></IconBase>
);

export const FigmaCircleIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}><circle cx="8" cy="8" r="5.25" /></IconBase>
);

export const FigmaTriangleIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}><path d="m8 2.7 5.6 10H2.4z" /></IconBase>
);

export const FigmaPathIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <path d="M3.5 11.5c2-5.3 5-5.3 9-7" />
    <rect x="2.5" y="10.5" width="2" height="2" rx=".25" />
    <rect x="11.5" y="3.5" width="2" height="2" rx=".25" />
  </IconBase>
);

export const FigmaPencilIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <path d="m3 11.8.5-2.6 6.9-6.9 2.3 2.3-6.9 6.9zM9.7 3l2.3 2.3" />
  </IconBase>
);

export const FigmaLayersIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <path d="m8 2.4 5.5 3.1L8 8.6 2.5 5.5z" />
    <path d="m3.2 8.2 4.8 2.7 4.8-2.7M3.2 10.8 8 13.6l4.8-2.8" />
  </IconBase>
);

export const FigmaLibraryIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <rect x="2.5" y="2.5" width="3" height="11" rx=".6" />
    <rect x="6.6" y="2.5" width="3" height="11" rx=".6" />
    <path d="m10.6 3.2 2.1-.6 2.8 10.2-2.1.6z" />
  </IconBase>
);

export const FigmaGlobeIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <circle cx="8" cy="8" r="5.4" />
    <path d="M2.8 8h10.4M8 2.6c1.5 1.6 2.2 3.4 2.2 5.4S9.5 11.8 8 13.4M8 2.6C6.5 4.2 5.8 6 5.8 8s.7 3.8 2.2 5.4" />
  </IconBase>
);

export const FigmaCmsIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <ellipse cx="8" cy="4" rx="4.8" ry="1.7" />
    <path d="M3.2 4v4c0 .9 2.1 1.7 4.8 1.7s4.8-.8 4.8-1.7V4M3.2 8v4c0 .9 2.1 1.7 4.8 1.7s4.8-.8 4.8-1.7V8" />
  </IconBase>
);

export const FigmaBranchIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <circle cx="4.2" cy="3.2" r="1.3" />
    <circle cx="4.2" cy="12.8" r="1.3" />
    <circle cx="11.8" cy="4.8" r="1.3" />
    <path d="M4.2 4.5v7M5.5 8h2.2c2.3 0 4.1-1.3 4.1-3.2" />
  </IconBase>
);

export const FigmaCodeIcon = (p: LoewFigmaIconProps) => (
  <IconBase {...p}>
    <path d="m5.4 4.5-3 3.5 3 3.5M10.6 4.5l3 3.5-3 3.5M9 2.8 7 13.2" />
  </IconBase>
);
