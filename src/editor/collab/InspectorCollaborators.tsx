import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/backend/user-store';
import { useCollaboration } from '@/canvas/collab/CollaborationProvider';
import UserAvatar from '@/editor/UserAvatar';
import CollaboratorsModal from './CollaboratorsModal';

interface Props {
  disabled?: boolean;
}

export default function InspectorCollaborators({ disabled = false }: Props) {
  const user = useAtomValue(userAtom);
  const { self, remoteUsers } = useCollaboration();
  const [open, setOpen] = useState(false);

  const name = user?.name ?? user?.email?.split('@')[0] ?? 'You';
  const color = self?.color ?? '#0d9668';
  const remoteCount = remoteUsers.length;

  return (
    <>
      <div className="flex shrink-0 items-center gap-1" data-inspector-collaboration>
        <div className="relative" title={remoteCount > 0 ? `${name} · ${remoteCount} collaborator${remoteCount === 1 ? '' : 's'} online` : name}>
          <UserAvatar name={name} avatarUrl={user?.image} color={color} size={24} />
          {self && <span className="absolute bottom-0 right-0 h-[6px] w-[6px] rounded-full border border-[var(--bg-panel)] bg-emerald-500" />}
        </div>
        <button
          type="button"
          aria-label="Add collaborator"
          title={disabled ? 'Only editors can add collaborators' : 'Add collaborator'}
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="flex h-5 w-5 items-center justify-center rounded-[4px] border-none bg-transparent text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="5" r="2.25" />
            <path d="M2.5 12c.5-2 1.75-3 3.5-3s3 .95 3.5 3" />
            <path d="M12.25 4.5v4M10.25 6.5h4" />
          </svg>
        </button>
      </div>
      <CollaboratorsModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
