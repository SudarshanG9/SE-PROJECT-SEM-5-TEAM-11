import { useEffect, useRef } from 'react'

export default function MergeConfirmation({
  preview, canApprove, finalizing, onConfirm, onCancel,
}) {
  const heading = useRef(null)
  useEffect(() => {
    heading.current.focus()
  }, [])

  return (
    <section className="result-card" aria-labelledby="merge-confirmation-heading">
      <h4 id="merge-confirmation-heading" ref={heading} tabIndex={-1}>Merge preview</h4>
      <p>Merge <strong>{preview.source.name}</strong> into <strong>{preview.target.name}</strong>.</p>
      <pre className="code-block" aria-label="Merged code">
        {preview.mergedCode}
      </pre>
      {preview.conflicts.length > 0 ? (
        <p role="alert">Resolve the branch conflicts before finalizing.</p>
      ) : canApprove ? (
        <p>Confirm to save this result as a merge commit on the target branch.</p>
      ) : (
        <p>A maintainer or owner must finalize this merge.</p>
      )}
      <div className="actions">
        {canApprove && preview.conflicts.length === 0 && (
          <button type="button" disabled={finalizing} onClick={onConfirm}>
            Confirm merge
          </button>
        )}
        <button type="button" className="clear-button" disabled={finalizing} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  )
}
