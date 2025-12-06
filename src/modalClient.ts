const createModalShell = (titleText: string) => {
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
  title.textContent = titleText;
  Object.assign(title.style, {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
  });

  modal.append(title);
  overlay.append(modal);

  return { overlay, modal };
};

const createActionsRow = () => {
  const actions = document.createElement('div');
  Object.assign(actions.style, {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
  });
  return actions;
};

const createPrimaryButton = (label: string) => {
  const button = document.createElement('button');
  button.textContent = label;
  Object.assign(button.style, {
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    background: '#0ea5e9',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: '600',
  });
  return button;
};

const createSecondaryButton = (label: string) => {
  const button = document.createElement('button');
  button.textContent = label;
  Object.assign(button.style, {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#0f172a',
    cursor: 'pointer',
    fontWeight: '600',
  });
  return button;
};

export const showSigningModal = (hashed: string) => {
  if (typeof document === 'undefined') return Promise.resolve(true);

  return new Promise<boolean>((resolve) => {
    const { overlay, modal } = createModalShell(
      'Do you want to sign this transaction?'
    );

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

    const actions = createActionsRow();

    const yesBtn = createPrimaryButton('Yes');
    const noBtn = createSecondaryButton('No');

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
    modal.append(hashLabel, actions);
    document.body.append(overlay);
  });
};

export const showAccountSelectionModal = (accounts: string[]) => {
  if (typeof document === 'undefined') return Promise.resolve(0);

  return new Promise<number>((resolve) => {
    const { overlay, modal } = createModalShell('Choose an account to use');

    const list = document.createElement('div');
    Object.assign(list.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginBottom: '16px',
    });

    let selectedIndex = 0;
    const items: HTMLButtonElement[] = [];

    const highlightSelection = () => {
      items.forEach((item, idx) => {
        item.style.borderColor = idx === selectedIndex ? '#0ea5e9' : '#cbd5e1';
        item.style.background = idx === selectedIndex ? '#e0f2fe' : '#e2e8f0';
      });
    };

    const okBtn = createPrimaryButton('Ok');
    okBtn.disabled = !accounts.length;

    accounts.forEach((account, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.textContent = account;
      Object.assign(item.style, {
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        background: '#e2e8f0',
        fontSize: '13px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        color: '#0f172a',
        wordBreak: 'break-all',
        textAlign: 'left',
        cursor: 'pointer',
      });

      item.onclick = () => {
        selectedIndex = index;
        highlightSelection();
        okBtn.disabled = false;
      };

      items.push(item);
      list.append(item);
    });

    if (items.length) {
      highlightSelection();
    }

    const actions = createActionsRow();

    const cleanup = () => {
      overlay.remove();
    };

    okBtn.onclick = () => {
      cleanup();
      resolve(selectedIndex);
    };

    actions.append(okBtn);
    modal.append(list, actions);
    document.body.append(overlay);
  });
};
