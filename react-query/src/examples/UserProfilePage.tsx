import { useUser, useUpdateUser } from '../hooks/useUser';

/**
 * Read + write in one screen. Covers the basic loading/error/data
 * triad and shows pending-state UX during a mutation.
 */
export default function UserProfilePage({ userId }: { userId: string }) {
  const { data: user, isPending, isError, error } = useUser(userId);
  const update = useUpdateUser();

  if (isPending) return <p>Loading…</p>;
  if (isError) return <p>Error: {(error as Error).message}</p>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      <button
        disabled={update.isPending}
        onClick={() =>
          update.mutate(
            { id: user.id, name: 'New name' },
            {
              // Prefer per-call onSuccess for screen-specific behavior
              // (toasts, navigation). Hook-level onSuccess is for cache.
              onSuccess: () => console.log('saved'),
            },
          )
        }
      >
        {update.isPending ? 'Saving…' : 'Rename'}
      </button>
    </div>
  );
}
