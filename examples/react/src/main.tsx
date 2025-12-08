import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Environment, ParaProvider } from '@getpara/react-sdk';
const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <ParaProvider
      paraClientConfig={{
        env: Environment.BETA,
        apiKey: import.meta.env.VITE_PARA_API_KEY,
      }}
      config={{ appName: 'Starter for MidenxPara' }}
    >
      <App />
    </ParaProvider>
  </QueryClientProvider>
);
