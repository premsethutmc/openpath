export type RecoveryState = {
  entry: string;
  errors: Record<string, number>;
  open: boolean;
  level: number;
  message: string | null;
};

/** Shared presentation; the server supplies problem-specific help and progression. */
export function WorkspaceRecovery({ state, onAction }: {
  state?: RecoveryState;
  onAction: (choice: "retry" | "hint") => void;
}) {
  if (!state?.open) return null;
  const canOfferMore = state.level < Math.min(3, state.errors[state.entry] || 1);
  return (
    <aside className="workspace-recovery" aria-label="Help with this number">
      <p role="status">{state.message || "Want a little help?"}</p>
      <div>
        <button className="secondary" onPointerDown={e => e.preventDefault()}
          onClick={() => onAction("retry")}>
          Try again
        </button>
        {canOfferMore && (
          <button className="link" onPointerDown={e => e.preventDefault()}
            onClick={() => onAction("hint")}>
            {state.level ? "More help" : "Give me a hint"}
          </button>
        )}
      </div>
    </aside>
  );
}
