import { createRoot } from 'react-dom/client';
import '@getpara/react-sdk-lite/styles.css';

import { ParaSignerProvider } from '@miden-sdk/miden-para';
import { MidenProvider } from '@miden-sdk/react';
import App from './App';

const paraApiKey = import.meta.env.VITE_PARA_API_KEY;

if (!paraApiKey) {
  console.warn('VITE_PARA_API_KEY not set. Para authentication will not work.');
}

createRoot(document.getElementById('root')!).render(
  <ParaSignerProvider
    apiKey={paraApiKey}
    environment="BETA"
    appName="Miden Para Signer Example"
  >
    <MidenProvider config={{ rpcUrl: 'testnet' }}>
      <App />
    </MidenProvider>
  </ParaSignerProvider>
);
