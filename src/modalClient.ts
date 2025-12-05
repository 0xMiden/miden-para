export const showSigningModal = (hashed: string) => {
  if (typeof document === 'undefined') return Promise.resolve(true);

  return new Promise<boolean>((resolve) => {
    const existing = document.getElementById('para-signing-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'para-signing-modal';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '9999',
      padding: '16px',
      boxSizing: 'border-box',
      color: '#0f172a',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    });

    const modal = document.createElement('div');
    Object.assign(modal.style, {
      background: '#f8fafc',
      borderRadius: '12px',
      padding: '20px',
      maxWidth: '420px',
      width: '100%',
      boxShadow: '0 12px 40px rgba(15, 23, 42, 0.25)',
    });

    const title = document.createElement('div');
    title.textContent = 'Do you want to sign this transaction?';
    Object.assign(title.style, {
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '12px',
    });

    const hashLabel = document.createElement('div');
    hashLabel.textContent = hashed;
    Object.assign(hashLabel.style, {
      fontSize: '13px',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      background: '#e2e8f0',
      padding: '10px',
      borderRadius: '8px',
      wordBreak: 'break-all',
      marginBottom: '16px',
      color: '#0f172a',
    });

    const actions = document.createElement('div');
    Object.assign(actions.style, {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
    });

    const yesBtn = document.createElement('button');
    yesBtn.textContent = 'Yes';
    Object.assign(yesBtn.style, {
      padding: '10px 16px',
      borderRadius: '8px',
      border: 'none',
      background: '#0ea5e9',
      color: '#fff',
      cursor: 'pointer',
      fontWeight: '600',
    });

    const noBtn = document.createElement('button');
    noBtn.textContent = 'No';
    Object.assign(noBtn.style, {
      padding: '10px 16px',
      borderRadius: '8px',
      border: '1px solid #cbd5e1',
      background: '#fff',
      color: '#0f172a',
      cursor: 'pointer',
      fontWeight: '600',
    });

    const cleanup = () => {
      overlay.remove();
    };

    yesBtn.onclick = () => {
      cleanup();
      resolve(true);
    };
    noBtn.onclick = () => {
      cleanup();
      resolve(false);
    };

    actions.append(noBtn, yesBtn);
    modal.append(title, hashLabel, actions);
    overlay.append(modal);
    document.body.append(overlay);
  });
};
