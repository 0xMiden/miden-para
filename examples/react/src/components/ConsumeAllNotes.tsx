import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ParaProvider, useAccount, useModal, useWallet} from "@getpara/react-sdk";
import { useMiden } from "../hooks/useMiden";
import "@getpara/react-sdk/styles.css";

const queryClient = new QueryClient();

const Consumer = () => {
  const { openModal } = useModal();
  const { isConnected } = useAccount();
  const { data: wallet } = useWallet();
  // Create the miden client the default node endpoint is testnet
  const { client, para, accountId, evmWallets } = useMiden('https://rpc.testnet.miden.io');

  if (!para || !evmWallets || !client) {
    return;
  }

  const consumeAllNotes = async () => {
    const { WebClient, AccountId } = await import("@demox-labs/miden-sdk");

    // use it as the normal `WebClient` instance
    await client.syncState();

    // to get typings
    if (!(client instanceof WebClient)) {
        return;
    }
    await client.syncState();
    let aId = AccountId.fromHex(accountId);
    const mintedNotes = await client.getConsumableNotes(aId);
    if (!mintedNotes.length) {
      console.log('No notes to consume.');
      return;
    }
    const mintedNoteIds = mintedNotes.map((n) =>
        n.inputNoteRecord().id().toString()
    );
    console.log("Minted Note Ids:", mintedNoteIds)
    const consumeTxRequest = client.newConsumeTransactionRequest(mintedNoteIds);
    aId = AccountId.fromHex(accountId);
    const txId = await client.submitNewTransaction(aId, consumeTxRequest);
    console.log("Notes consumed.", txId.toHex())
  };

  return (
    <div>
      {!isConnected ? (
        <button onClick={() => openModal()}>Connect Wallet</button>
      ) : (
        <div>
          <p>Connected: {wallet?.address}</p>
        </div>
      )}

      <button onClick={consumeAllNotes}>ConsumeNotes </button>
    </div>
  );
}

export const ConsumeAllNotes = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ParaProvider
        paraClientConfig={{
          apiKey: import.meta.env.VITE_PARA_API_KEY,
        }}
        config={{ appName: "Starter for MidenxPara" }}
      >
        <Consumer/>
      </ParaProvider>
    </QueryClientProvider>
  );
}