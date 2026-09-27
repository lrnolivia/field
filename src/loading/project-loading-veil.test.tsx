import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProjectLoadingVeil, { LOADING_VEIL_BACKDROP } from './ProjectLoadingVeil';

describe('ProjectLoadingVeil', () => {
  it('keeps the workspace visible under a restrained backdrop', () => {
    expect(LOADING_VEIL_BACKDROP).toEqual({ blurPx: 18, grayscale: 0.2, dim: 0.56 });
    const { container } = render(<ProjectLoadingVeil status="Opening project" />);
    expect(screen.getByRole('status').textContent).toContain('Opening project');
    expect(container.querySelector('[data-loading-logo]')).not.toBeNull();
    expect(container.querySelector('[data-loading-progress]')).not.toBeNull();
  });

  it('shows progress while opening and actionable recovery when loading is delayed', () => {
    const { rerender, container } = render(<ProjectLoadingVeil status="Starting canvas" />);
    expect(container.querySelector('[data-loading-progress]')).not.toBeNull();

    rerender(
      <ProjectLoadingVeil
        status="Canvas is taking longer to start"
        detail="The project loaded, but the visual canvas has not painted yet."
        recoverable
      />,
    );
    expect(screen.getByText('The project loaded, but the visual canvas has not painted yet.').textContent)
      .toContain('The project loaded');
    expect(screen.getByRole('button', { name: 'Retry' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Back to projects' })).not.toBeNull();
    expect(container.querySelector('[data-loading-progress]')).toBeNull();
  });
});
