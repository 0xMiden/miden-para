import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Environment, ParaProvider } from '@getpara/react-sdk-lite';
import '@getpara/react-sdk-lite/styles.css';

import { ParaSignerProvider } from '@miden-sdk/miden-para';
import { MidenProvider, SignerContext } from '@miden-sdk/react';
import App from './App';

const queryClient = new QueryClient();

const paraApiKey = import.meta.env.VITE_PARA_API_KEY;

if (!paraApiKey) {
  console.warn('VITE_PARA_API_KEY not set. Para authentication will not work.');
}

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <ParaProvider
      paraClientConfig={{
        env: Environment.BETA,
        apiKey: paraApiKey,
      }}
      config={{ appName: 'Miden Para Signer Example' }}
    >
      <ParaSignerProvider
        apiKey={paraApiKey}
        environment="BETA"
        showSigningModal={true}
        signerContext={SignerContext}
      >
        <MidenProvider config={{ rpcUrl: 'testnet' }}>
          <App />
        </MidenProvider>
      </ParaSignerProvider>
    </ParaProvider>
  </QueryClientProvider>
);
