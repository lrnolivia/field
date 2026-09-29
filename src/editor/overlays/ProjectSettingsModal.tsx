// ProjectSettingsModal.tsx — compact project/site configuration.
//
// field-level preferences belong in the full-screen General Settings surface.
// This modal owns only settings that persist with or describe the current
// project/site source.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import Modal from '@/design-system/Modal';
import {
  projectSettingsModalOpenAtom,
  websiteSettingsAtom,
  loadSettingsFromLayout,
} from '@/code/stores/website-settings-store';
import { queueMutation } from '@/code/mutation/mutation-queue';
import { getProjectId } from '@/backend/project-id';
import { setWebsiteWatermark } from '@/backend/revyme-backend';
import { trace } from '@/shared/debug-trace';
import { CLOUD_ENABLED } from '@/shared/cloud-flag';
import {
  ConfirmModal,
  LANGUAGE_OPTIONS,
  ROW_INPUT_CLS,
  RowButton,
  RowSelect,
  SaveButton,
  SettingsGroup,
  SettingsRow,
  Toggle,
} from './settings-shared';

function UploadIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function TrashIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export default function ProjectSettingsModal() {
  const [isOpen, setIsOpen] = useAtom(projectSettingsModalOpenAtom);
  const [settings, setSettings] = useAtom(websiteSettingsAtom);
  const websiteId = getProjectId() || '';

  const faviconInputRef = useRef<HTMLInputElement>(null);
  const socialInputRef = useRef<HTMLInputElement>(null);

  const [siteName, setSiteName] = useState(settings.name || '');
  const [description, setDescription] = useState(settings.description || '');
  const [language, setLanguage] = useState(settings.languageCode || 'en');
  const [defaultTheme, setDefaultTheme] = useState<'light' | 'dark' | 'system'>(settings.defaultTheme || 'light');
  const [customHead, setCustomHead] = useState(settings.customCodeHead || '');
  const [customBody, setCustomBody] = useState(settings.customCodeBody || '');
  const [subdomain, setSubdomain] = useState<string | null>(null);

  const [showBadge, setShowBadge] = useState(true);
  const [badgeLoaded, setBadgeLoaded] = useState(false);

  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingSocial, setUploadingSocial] = useState(false);
  const [deletingFavicon, setDeletingFavicon] = useState(false);
  const [deletingSocial, setDeletingSocial] = useState(false);
  const [confirmFaviconRemove, setConfirmFaviconRemove] = useState(false);
  const [confirmSocialRemove, setConfirmSocialRemove] = useState(false);

  const metadataDirty =
    siteName !== (settings.name || '') ||
    description !== (settings.description || '') ||
    language !== (settings.languageCode || 'en');
  const themeDirty = defaultTheme !== (settings.defaultTheme || 'light');
  const codeDirty =
    customHead !== (settings.customCodeHead || '') ||
    customBody !== (settings.customCodeBody || '');

  useEffect(() => {
    if (!isOpen) return;
    const fresh = loadSettingsFromLayout();
    setSettings(fresh);
    setSiteName(fresh.name);
    setDescription(fresh.description);
    setLanguage(fresh.languageCode);
    setDefaultTheme(fresh.defaultTheme);
    setCustomHead(fresh.customCodeHead);
    setCustomBody(fresh.customCodeBody);
    trace.action('project-settings:open');
  }, [isOpen, setSettings]);

  useEffect(() => {
    if (!isOpen || !websiteId) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/websites/${websiteId}`, { credentials: 'include' });
        if (!response.ok) return;
        const data = await response.json() as { subdomain?: string; hide_watermark?: boolean };
        if (cancelled) return;
        setSubdomain(data.subdomain || null);
        setShowBadge(!(data.hide_watermark ?? false));
        setBadgeLoaded(true);
      } catch {
        if (!cancelled) setBadgeLoaded(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, websiteId]);

  const close = () => {
    trace.action('project-settings:close');
    setIsOpen(false);
  };

  const saveMetadata = () => {
    if (!metadataDirty) return;
    setSettings({ ...settings, name: siteName, description, languageCode: language });
    queueMutation({ type: 'updateMetadata', metadata: { title: siteName, description } });
    queueMutation({ type: 'updateSiteConfig', config: { language } });
    trace.action('project-settings:save-metadata');
  };

  const saveTheme = () => {
    if (!themeDirty) return;
    setSettings({ ...settings, defaultTheme });
    queueMutation({ type: 'updateSiteConfig', config: { theme: defaultTheme } });
    trace.action('project-settings:save-theme', { defaultTheme });
  };

  const saveCustomCode = () => {
    if (!codeDirty) return;
    setSettings({ ...settings, customCodeHead: customHead, customCodeBody: customBody });
    queueMutation({ type: 'updateSiteConfig', config: { customHead, customBody } });
    trace.action('project-settings:save-custom-code');
  };

  const uploadMetadata = useCallback(async (
    file: File,
    source: string,
    setLoading: (value: boolean) => void,
    onSuccess: (url: string) => void,
  ) => {
    if (!websiteId) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'metadata');
      formData.append('source', source);
      formData.append('websiteId', websiteId);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json() as { url: string };
      onSuccess(data.url);
    } catch (error) {
      trace.error('project-settings:upload-failed', { source, error: String(error) });
      alert('Failed to upload. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [websiteId]);

  const uploadFavicon = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void uploadMetadata(file, 'favicon-light', setUploadingFavicon, (url) => {
      setSettings({ ...settings, faviconLight: url });
      queueMutation({ type: 'updateMetadata', metadata: { icons: { icon: url } } });
    });
    event.target.value = '';
  };

  const uploadSocial = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void uploadMetadata(file, 'social-share-default', setUploadingSocial, (url) => {
      setSettings({ ...settings, socialShareImage: url });
      queueMutation({ type: 'updateMetadata', metadata: { openGraph: { images: [url] } } });
    });
    event.target.value = '';
  };

  const deleteStoredFile = async (url: string) => {
    const response = await fetch('/api/delete-file', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) throw new Error('Delete failed');
  };

  const removeFavicon = async () => {
    setConfirmFaviconRemove(false);
    if (!settings.faviconLight) return;
    setDeletingFavicon(true);
    try {
      await deleteStoredFile(settings.faviconLight);
      setSettings({ ...settings, faviconLight: '' });
      queueMutation({ type: 'updateMetadata', metadata: { icons: { icon: '' } } });
    } catch (error) {
      trace.error('project-settings:remove-favicon-failed', { error: String(error) });
      alert('Failed to remove favicon. Please try again.');
    } finally {
      setDeletingFavicon(false);
    }
  };

  const removeSocial = async () => {
    setConfirmSocialRemove(false);
    if (!settings.socialShareImage) return;
    setDeletingSocial(true);
    try {
      await deleteStoredFile(settings.socialShareImage);
      setSettings({ ...settings, socialShareImage: '' });
      queueMutation({ type: 'updateMetadata', metadata: { openGraph: { images: [] } } });
    } catch (error) {
      trace.error('project-settings:remove-social-failed', { error: String(error) });
      alert('Failed to remove social image. Please try again.');
    } finally {
      setDeletingSocial(false);
    }
  };

  const toggleBadge = (show: boolean) => {
    setShowBadge(show);
    void setWebsiteWatermark(websiteId, !show).catch(() => setShowBadge(!show));
    trace.action('project-settings:watermark-toggle', { websiteId, show });
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={close} title="Project settings" width={640}>
        <div data-project-settings-modal className="px-3 py-3 space-y-3">
          <SettingsGroup surface title="Site metadata" action={<SaveButton onClick={saveMetadata} saving={false} dirty={metadataDirty} />}>
            <SettingsRow label="Name" htmlFor="project-site-name">
              <input id="project-site-name" value={siteName} onChange={(event) => setSiteName(event.target.value)} className={ROW_INPUT_CLS} placeholder="My website" />
            </SettingsRow>
            <SettingsRow label="Default language" htmlFor="project-language">
              <RowSelect id="project-language" value={language} options={LANGUAGE_OPTIONS} onChange={setLanguage} />
            </SettingsRow>
            <SettingsRow label="Description" htmlFor="project-description" align="top">
              <textarea id="project-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className={`${ROW_INPUT_CLS} resize-none min-h-[56px]`} placeholder="A brief description of your website…" />
            </SettingsRow>
            <SettingsRow label="Search preview" align="top" interactive={false}>
              <div className="cut-corners cut-border border border-[var(--border-light)] [--cut-border-color:var(--border-light)] bg-[var(--bg-hover)]/20 px-3 py-2.5">
                <div className="text-[10px] text-[var(--text-tertiary)] truncate">{subdomain ? `${subdomain}.revyme.app` : 'yoursite.revyme.app'}</div>
                <div className="mt-1 text-[14px] text-[#8ab4f8] font-medium leading-tight truncate">{siteName || 'My website'}</div>
                <div className="mt-1 text-[11px] text-[var(--text-secondary)] leading-4">{description || 'Made with Revyme'}</div>
              </div>
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup surface title="Branding">
            <input ref={faviconInputRef} type="file" accept="image/png,image/x-icon,image/vnd.microsoft.icon" onChange={uploadFavicon} className="hidden" />
            <input ref={socialInputRef} type="file" accept="image/jpeg,image/jpg,image/png" onChange={uploadSocial} className="hidden" />

            <SettingsRow label="Favicon" align="top">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 shrink-0 cut-corners cut-border border border-[var(--border-light)] [--cut-border-color:var(--border-light)] bg-[var(--bg-hover)]/50 flex items-center justify-center overflow-hidden">
                    {settings.faviconLight ? <img src={settings.faviconLight} alt="Favicon" className="w-full h-full object-contain" /> : <span className="text-[9px] text-[var(--text-tertiary)]">32×32</span>}
                  </div>
                  <RowButton onClick={() => faviconInputRef.current?.click()} loading={uploadingFavicon}><UploadIcon /> Upload</RowButton>
                  {settings.faviconLight && <RowButton onClick={() => setConfirmFaviconRemove(true)} loading={deletingFavicon} variant="danger" title="Remove favicon"><TrashIcon /></RowButton>}
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">PNG or ICO, ideally 32×32 or 64×64.</p>
              </div>
            </SettingsRow>

            <SettingsRow label="Social image" align="top">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-[50px] shrink-0 cut-corners cut-border border border-[var(--border-light)] [--cut-border-color:var(--border-light)] bg-[var(--bg-hover)]/50 flex items-center justify-center overflow-hidden">
                    {settings.socialShareImage ? <img src={settings.socialShareImage} alt="Social share" className="w-full h-full object-cover" /> : <span className="text-[9px] text-[var(--text-tertiary)]">1200×630</span>}
                  </div>
                  <RowButton onClick={() => socialInputRef.current?.click()} loading={uploadingSocial}><UploadIcon /> Upload</RowButton>
                  {settings.socialShareImage && <RowButton onClick={() => setConfirmSocialRemove(true)} loading={deletingSocial} variant="danger" title="Remove social image"><TrashIcon /></RowButton>}
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">Used when the site is shared on social platforms.</p>
              </div>
            </SettingsRow>

            {CLOUD_ENABLED && (
              <SettingsRow label="Made in Revyme badge">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-[var(--text-tertiary)]">Show the published-site badge.</p>
                  <div className={badgeLoaded ? '' : 'opacity-40 pointer-events-none'}>
                    <Toggle value={showBadge} onChange={toggleBadge} />
                  </div>
                </div>
              </SettingsRow>
            )}
          </SettingsGroup>

          <SettingsGroup surface title="Site appearance" action={<SaveButton onClick={saveTheme} saving={false} dirty={themeDirty} />}>
            <SettingsRow label="Default theme" htmlFor="project-default-theme" align="top">
              <div className="flex flex-col gap-1">
                <RowSelect
                  id="project-default-theme"
                  value={defaultTheme}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'system', label: 'System' },
                  ]}
                  onChange={(value) => setDefaultTheme(value as 'light' | 'dark' | 'system')}
                />
                <p className="text-xs text-[var(--text-tertiary)]">Initial theme when visitors load this site.</p>
              </div>
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup surface title="Custom code" action={<SaveButton onClick={saveCustomCode} saving={false} dirty={codeDirty} />}>
            <SettingsRow label="End of <head> tag" htmlFor="project-custom-head" align="top">
              <textarea id="project-custom-head" rows={4} value={customHead} onChange={(event) => setCustomHead(event.target.value)} className={`${ROW_INPUT_CLS} resize-none font-mono text-xs min-h-[72px]`} placeholder="<!-- Analytics, meta tags, or custom CSS -->" />
            </SettingsRow>
            <SettingsRow label="End of <body> tag" htmlFor="project-custom-body" align="top">
              <textarea id="project-custom-body" rows={4} value={customBody} onChange={(event) => setCustomBody(event.target.value)} className={`${ROW_INPUT_CLS} resize-none font-mono text-xs min-h-[72px]`} placeholder="<!-- Scripts or tracking code -->" />
            </SettingsRow>
          </SettingsGroup>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmFaviconRemove}
        onCancel={() => setConfirmFaviconRemove(false)}
        onConfirm={() => void removeFavicon()}
        title="Remove favicon?"
        message="This removes the favicon from the current project."
        confirmLabel="Remove"
        variant="danger"
        isLoading={deletingFavicon}
      />
      <ConfirmModal
        isOpen={confirmSocialRemove}
        onCancel={() => setConfirmSocialRemove(false)}
        onConfirm={() => void removeSocial()}
        title="Remove social image?"
        message="This removes the social share image from the current project."
        confirmLabel="Remove"
        variant="danger"
        isLoading={deletingSocial}
      />
    </>
  );
}
