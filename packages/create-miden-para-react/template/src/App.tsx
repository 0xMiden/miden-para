import './App.css';
import '@getpara/react-sdk-lite/styles.css';
import { ParaSignerProvider, useParaSigner } from '@miden-sdk/miden-para';
import { MidenProvider, useSigner, useMiden } from '@miden-sdk/react';

function App() {
  return (
    <ParaSignerProvider
      apiKey={import.meta.env.VITE_PARA_API_KEY}
      environment="BETA"
      appName="Starter for MidenxPara"
    >
      <MidenProvider config={{ rpcUrl: 'testnet' }}>
        <Content />
      </MidenProvider>
    </ParaSignerProvider>
  );
}

function Content() {
  const signer = useSigner();
  const { wallet } = useParaSigner();
  const { isReady, signerAccountId } = useMiden();

  const handleConnect = async () => {
    if (signer?.isConnected) {
      await signer.disconnect();
    } else {
      await signer?.connect();
    }
  };

  return (
    <div>
      <button onClick={handleConnect}>
        {signer?.isConnected ? 'Disconnect Para' : 'Connect with Para'}
      </button>
      {signer?.isConnected && (
        <>
          <p>Wallet: {wallet?.address ?? '—'}</p>
          <p>Account: {signerAccountId ?? '—'}</p>
          <p>Client ready: {isReady ? 'yes' : 'no'}</p>
        </>
      )}
    </div>
  );
}

export default App;
