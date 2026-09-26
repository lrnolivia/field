export interface FieldProjectNavigationOptions {
  holdReveal?: boolean;
  replace?: boolean;
}

export interface FieldDashboardNavigationOptions {
  replace?: boolean;
}

export interface FieldNavigationHandler {
  openProject(id: string, options?: FieldProjectNavigationOptions): Promise<void>;
  showDashboard(options?: FieldDashboardNavigationOptions): Promise<void>;
  releaseProjectReveal(id?: string): void;
}

let navigationHandler: FieldNavigationHandler | null = null;

export function registerFieldNavigationHandler(handler: FieldNavigationHandler): () => void {
  navigationHandler = handler;
  return () => {
    if (navigationHandler === handler) navigationHandler = null;
  };
}

export async function openFieldProject(
  id: string,
  options: FieldProjectNavigationOptions = {},
): Promise<void> {
  const projectId = id.trim();
  if (!projectId) throw new Error('Project id is required');
  if (navigationHandler) {
    await navigationHandler.openProject(projectId, options);
    return;
  }
  if (typeof window !== 'undefined') {
    const url = `/builder/${encodeURIComponent(projectId)}`;
    if (options.replace) window.location.replace(url);
    else window.location.assign(url);
  }
}

export async function showFieldDashboard(
  options: FieldDashboardNavigationOptions = {},
): Promise<void> {
  if (navigationHandler) {
    await navigationHandler.showDashboard(options);
    return;
  }
  if (typeof window !== 'undefined') {
    if (options.replace) window.location.replace('/');
    else window.location.assign('/');
  }
}

export function releaseFieldProjectReveal(id?: string): void {
  navigationHandler?.releaseProjectReveal(id);
}
