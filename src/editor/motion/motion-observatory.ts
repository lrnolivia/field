import type { FieldMotionDiagnosis } from './field-motion';

export type FieldMotionScenarioId =
  | 'left-pane-toggle'
  | 'workspace-mode-morph'
  | 'inspector-appear-detach'
  | 'toolbar-panel-open-peek'
  | 'toolbar-panel-drag'
  | 'toolbar-panel-resize'
  | 'dashboard-editor-reference'
  | 'focus-camera-reference';

export interface FieldMotionScenario {
  id: FieldMotionScenarioId;
  surface: string;
  interaction: 'automated' | 'direct-manipulation' | 'reference';
  watch: readonly FieldMotionDiagnosis[];
}

export const FIELD_MOTION_SCENARIOS: readonly FieldMotionScenario[] = Object.freeze([
  { id: 'left-pane-toggle', surface: 'left workspace island', interaction: 'automated', watch: ['geometric-discontinuity', 'perceptual-judder', 'paint-filter-cost'] },
  { id: 'workspace-mode-morph', surface: 'workspace chrome', interaction: 'automated', watch: ['geometric-discontinuity', 'perceptual-judder'] },
  { id: 'inspector-appear-detach', surface: 'right inspector', interaction: 'automated', watch: ['geometric-discontinuity', 'perceptual-judder'] },
  { id: 'toolbar-panel-open-peek', surface: 'toolbar panel', interaction: 'automated', watch: ['paint-filter-cost', 'geometric-discontinuity', 'reduced-motion-mismatch'] },
  { id: 'toolbar-panel-drag', surface: 'toolbar panel', interaction: 'direct-manipulation', watch: ['main-thread-jank'] },
  { id: 'toolbar-panel-resize', surface: 'toolbar panel', interaction: 'direct-manipulation', watch: ['main-thread-jank', 'paint-filter-cost'] },
  { id: 'dashboard-editor-reference', surface: 'field shell', interaction: 'reference', watch: [] },
  { id: 'focus-camera-reference', surface: 'canvas camera', interaction: 'reference', watch: [] },
]);
