import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { useAtomValue, useSetAtom } from 'jotai';
import { userAtom } from '@/backend/user-store';
import {
  deleteFieldAvatar,
  uploadFieldAvatar,
} from '@/backend/field-profile';
import UserAvatar from '@/editor/UserAvatar';
import AvatarCropModal from './AvatarCropModal';

interface Props {
  anchorRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

function providerLabel(raw?: string): string {
  if (!raw) return 'provider';

  const value = raw.toLowerCase();

  if (value.includes('google')) return 'Google';
  if (value.includes('github')) return 'GitHub';
  if (value.includes('apple')) return 'Apple';

  return raw;
}

export default function ProfilePopover({
  anchorRef,
  onClose,
}: Props) {
  const user = useAtomValue(userAtom);
  const setUser = useSetAtom(userAtom);

  const panelRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [position, setPosition] = useState({ top: 52, left: 8 });
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const reposition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;

      const width = 280;

      setPosition({
        top: rect.bottom + 7,
        left: Math.max(
          8,
          Math.min(window.innerWidth - width - 8, rect.right - width),
        ),
      });
    };

    reposition();
    window.addEventListener('resize', reposition);

    return () => window.removeEventListener('resize', reposition);
  }, [anchorRef]);

  useEffect(() => {
    // The cropper is portaled outside the profile card. While it is open,
    // don't let the profile card's outside-click detector tear it down.
    if (cropFile) return;

    const handler = (event: MouseEvent) => {
      const target = event.target as Node;

      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;

      onClose();
    };

    document.addEventListener('mousedown', handler, true);

    return () => document.removeEventListener('mousedown', handler, true);
  }, [anchorRef, cropFile, onClose]);

  if (!user || typeof document === 'undefined') return null;

  const provider = providerLabel(user.identityProvider);

  const selectFile = (file?: File) => {
    if (!file) return;

    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('Choose an image smaller than 20 MB.');
      return;
    }

    setCropFile(file);
  };

  const saveAvatar = async (blob: Blob) => {
    setSaving(true);
    setError('');

    try {
      const profile = await uploadFieldAvatar(blob);

      if (!profile.avatarUrl) {
        throw new Error('Avatar upload returned no image URL');
      }

      setUser((current) =>
        current?.id === user.id
          ? {
              ...current,
              image: profile.avatarUrl ?? undefined,
              hasCustomImage: true,
            }
          : current,
      );

      setCropFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const removeCustomAvatar = async () => {
    setSaving(true);
    setError('');

    try {
      await deleteFieldAvatar();

      setUser((current) =>
        current?.id === user.id
          ? {
              ...current,
              image: current.providerImage,
              hasCustomImage: false,
            }
          : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {createPortal(
        <div
          ref={panelRef}
          className="fixed z-[100000] w-[280px] overflow-hidden rounded-[9px] border border-[var(--border-light)] bg-[var(--bg-panel)] shadow-2xl"
          style={{
            top: position.top,
            left: position.left,
          }}
        >
          <div className="flex items-center gap-3 px-3.5 py-3">
            <UserAvatar
              name={user.name}
              avatarUrl={user.image}
              size={40}
              color="#0d9668"
            />

            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-semibold text-[var(--text-primary)]">
                {user.name}
              </div>

              <div className="truncate text-[10px] text-[var(--text-tertiary)]">
                {user.email}
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border-light)] px-2 py-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                selectFile(event.currentTarget.files?.[0]);
                event.currentTarget.value = '';
              }}
            />

            <button
              type="button"
              disabled={saving}
              onClick={() => fileRef.current?.click()}
              className="flex h-8 w-full items-center rounded-[5px] px-2 text-left text-[11px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
            >
              Change photo…
            </button>

            {user.hasCustomImage && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void removeCustomAvatar()}
                className="flex h-8 w-full items-center rounded-[5px] px-2 text-left text-[11px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
              >
                {user.providerImage
                  ? `Use ${provider} photo`
                  : 'Remove photo'}
              </button>
            )}

            {!user.hasCustomImage && user.providerImage && (
              <div className="px-2 py-1 text-[9px] text-[var(--text-tertiary)]">
                Using your {provider} profile photo
              </div>
            )}

            {!user.providerImage && (
              <div className="px-2 py-1 text-[9px] leading-relaxed text-[var(--text-tertiary)]">
                Your sign-in provider did not expose a profile photo to field.
              </div>
            )}
          </div>

          {error && (
            <div className="border-t border-[var(--border-light)] px-3 py-2 text-[9px] leading-relaxed text-red-400">
              {error}
            </div>
          )}
        </div>,
        document.body,
      )}

      {cropFile && (
        <AvatarCropModal
          file={cropFile}
          saving={saving}
          onCancel={() => {
            if (!saving) setCropFile(null);
          }}
          onSave={saveAvatar}
        />
      )}
    </>
  );
}
