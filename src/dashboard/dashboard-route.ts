export type FieldSurface = 'dashboard' | 'builder';

export function resolveFieldSurface(pathname: string): FieldSurface {
  return pathname === '/' || pathname === '/dashboard' ? 'dashboard' : 'builder';
}
