import { TxSummaryJson } from './types';

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

/**
 * Shows a lightweight confirmation modal for signing a hashed transaction.
 * Resolves to true when the user confirms, false when cancelled; no-op on the server.
 */
export const signingModal = (txSummaryJson: TxSummaryJson) => {
  if (typeof document === 'undefined') return Promise.resolve(true);

  return new Promise<boolean>((resolve) => {
    const { overlay, modal } = createModalShell(
      'Do you want to sign this transaction?'
    );

    const txDetails = document.createElement('div');
    Object.assign(txDetails.style, {
      fontSize: '13px',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      background: '#e2e8f0',
      padding: '10px',
      borderRadius: '8px',
      marginBottom: '16px',
      color: '#0f172a',
      maxHeight: '300px',
      overflowY: 'auto',
    });

    const inputSection = document.createElement('div');
    inputSection.style.marginBottom = '12px';
    const inputTitle = document.createElement('div');
    inputTitle.textContent = 'Input Notes:';
    inputTitle.style.fontWeight = '600';
    inputTitle.style.marginBottom = '4px';
    inputSection.append(inputTitle);

    if (txSummaryJson.inputNotes.length === 0) {
      const noInputs = document.createElement('div');
      noInputs.textContent = 'None';
      noInputs.style.color = '#64748b';
      inputSection.append(noInputs);
    } else {
      txSummaryJson.inputNotes.forEach((note, idx) => {
        const noteDiv = document.createElement('div');
        noteDiv.style.marginBottom = '8px';
        noteDiv.style.paddingLeft = '8px';
        noteDiv.innerHTML = `
          <div><strong>Note ${idx + 1}:</strong> ${note.id}</div>
          <div style="padding-left: 8px; color: #475569;">
            Sender: ${note.sender}<br/>
            Assets: ${note.assets.map((a) => `${a.amount} of ${a.assetId}`).join(', ') || 'None'}
          </div>
        `;
        inputSection.append(noteDiv);
      });
    }

    const outputSection = document.createElement('div');
    const outputTitle = document.createElement('div');
    outputTitle.textContent = 'Output Notes:';
    outputTitle.style.fontWeight = '600';
    outputTitle.style.marginBottom = '4px';
    outputSection.append(outputTitle);

    if (txSummaryJson.outputNotes.length === 0) {
      const noOutputs = document.createElement('div');
      noOutputs.textContent = 'None';
      noOutputs.style.color = '#64748b';
      outputSection.append(noOutputs);
    } else {
      txSummaryJson.outputNotes.forEach((note, idx) => {
        const noteDiv = document.createElement('div');
        noteDiv.style.marginBottom = '8px';
        noteDiv.style.paddingLeft = '8px';
        noteDiv.innerHTML = `
          <div><strong>Note ${idx + 1}:</strong> ${note.id}</div>
          <div style="padding-left: 8px; color: #475569;">
            Type: ${note.noteType}<br/>
            Assets: ${note.assets.map((a) => `${a.amount} of ${a.assetId}`).join(', ') || 'None'}
          </div>
        `;
        outputSection.append(noteDiv);
      });
    }

    txDetails.append(inputSection, outputSection);

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
    modal.append(txDetails, actions);
    document.body.append(overlay);
  });
};

/**
 * Shows a selectable list of account commitments and resolves with the chosen index.
 * Returns 0 immediately when only one account is provided or when running server-side.
 */
export const accountSelectionModal = (accounts: string[]) => {
  if (accounts.length === 1 || typeof document === 'undefined') {
    return Promise.resolve(0);
  }

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
