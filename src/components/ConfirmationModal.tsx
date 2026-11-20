import type { ActionStep } from '../shared/actionValidator';

interface ConfirmationModalProps {
  step: ActionStep;
  onApprove: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({ step, onApprove, onCancel }: ConfirmationModalProps) {
  const entries = Object.entries(step.parameters);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-action-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1525] p-6 shadow-2xl">
        <h2
          id="confirm-action-title"
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          Confirm Sensitive Action
        </h2>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          Review the validated parameters before Sifat Agent opens this system operation.
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151F35] p-4 space-y-2">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {step.action.replace(/_/g, ' ')}
          </div>
          <div className="text-xs font-medium text-amber-600 dark:text-amber-400">
            Risk: {step.riskLevel} · Permission: {step.permissionRequirement}
          </div>
          {step.description && (
            <p className="text-sm text-slate-700 dark:text-slate-300">{step.description}</p>
          )}
          {entries.length > 0 && (
            <dl className="pt-2 border-t border-slate-200 dark:border-slate-700/70 space-y-1.5">
              {entries.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 text-xs">
                  <dt className="text-slate-500 dark:text-slate-400 font-mono">{key}</dt>
                  <dd className="text-slate-900 dark:text-slate-100 font-medium text-right break-all">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApprove}
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0"
          >
            Approve & Preview
          </button>
        </div>
      </div>
    </div>
  );
}
