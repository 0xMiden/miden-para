import './App.css';
import '@getpara/react-sdk/styles.css';
import { ParaProvider, useAccount, useModal } from '@getpara/react-sdk';
import { useParaMiden } from 'miden-para-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ParaProvider
        paraClientConfig={{
          apiKey: import.meta.env.VITE_PARA_API_KEY,
        }}
        config={{ appName: 'Starter for MidenxPara' }}
      >
        <Content />
      </ParaProvider>
    </QueryClientProvider>
  );
}

function Content() {
  const { client, accountId } = useParaMiden('https://rpc.testnet.miden.io');
  const { isConnected } = useAccount();
  const { openModal } = useModal();

  return (
    <div>
      {!isConnected ? (
        <button onClick={() => openModal?.()}>
          Connect with Para
        </button>
      ) : (
        <>
          <p>Account: {accountId ?? '—'}</p>
          <p>Client ready: {client ? 'yes' : 'no'}</p>
        </>
      )}
    </div>
  );
}

export default App;
