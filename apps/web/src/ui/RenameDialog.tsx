import { FormEvent, useEffect, useState } from "react";

type RenameDialogProps = {
  allowUnchanged?: boolean;
  error?: string | null;
  label: string;
  initialValue: string;
  onCancel: () => void;
  onSubmit: (value: string) => Promise<void> | void;
};

export function RenameDialog({ allowUnchanged = false, error, label, initialValue, onCancel, onSubmit }: RenameDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = value.trim();
    if (!next || (!allowUnchanged && next === initialValue)) {
      onCancel();
      return;
    }
    setSaving(true);
    try {
      await onSubmit(next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <form className="rename-dialog" onSubmit={submit}>
        <h2>{label}</h2>
        <label>
          Name
          <input autoFocus value={value} onChange={(event) => setValue(event.target.value)} />
        </label>
        {error && <p className="status-message failed">{error}</p>}
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Abbrechen
          </button>
          <button disabled={saving || !value.trim()} type="submit">
            Speichern
          </button>
        </div>
      </form>
    </div>
  );
}
