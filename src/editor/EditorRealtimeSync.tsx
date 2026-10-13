import { useEffect } from 'react';
import { startEditorRealtimeSync } from '@/backend/editor-realtime';

/**
 * Side-effect-only editor host for field's durable project event stream.
 * Canvas/Content/Code/inspector all update through the shared ProjectFS model;
 * this component intentionally renders no separate visual overlay.
 */
export default function EditorRealtimeSync() {
  useEffect(() => startEditorRealtimeSync(), []);
  return null;
}
