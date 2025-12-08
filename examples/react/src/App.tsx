import { Button } from './components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './components/ui/table';
import { Wallet, Coins, Send, Eye } from 'lucide-react';
import { useAccount, useLogout, useModal, useWallet } from '@getpara/react-sdk';
import '@getpara/react-sdk/styles.css';
import { useParaMiden } from 'miden-para-react';
import { createFaucetMintAndConsume } from './lib/mint';
import {
  MintConsumeDialog,
  type MintAndConsumeProgress,
} from './components/MintConsumeDialog';
import { SendDialog } from './components/SendDialog';
import { getBalance } from './lib/getBalance';
import { send } from './lib/send';
import { useState, useEffect } from 'react';

function App() {
  const { isConnected } = useAccount();
  const { data: wallet } = useWallet();
  const { openModal } = useModal();
  const { logoutAsync } = useLogout();
  const { client, accountId } = useParaMiden(
    'https://rpc.testnet.miden.io',
    'public',
    {
      accountSeed: 'hello world',
      noteTransportUrl: 'https://transport.miden.io',
    }
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [progress, setProgress] = useState<MintAndConsumeProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState<Array<{
    assetId: string;
    balance: string;
  }> | null>(null);
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [address, setAddress] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { AccountId, Address, NetworkId } =
        await import('@demox-labs/miden-sdk');
      if (accountId) {
        setAddress(
          Address.fromAccountId(AccountId.fromHex(accountId)).toBech32(
            NetworkId.Testnet
          )
        );
      }
    })();
  }, [accountId]);

  const onConnect = async () => {
    console.log('isConnected', isConnected);
    if (isConnected) {
      await logoutAsync();
    }
    openModal();
  };
  useEffect(() => {
    if (!accountId) return;

    const fetchBalances = async () => {
      try {
        const fetchedBalances = await getBalance(accountId);
        setBalances(fetchedBalances);
      } catch (err) {
        console.error('Failed to fetch balances:', err);
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 5000);

    return () => clearInterval(interval);
  }, [accountId]);

  const handleMintConsume = async () => {
    if (!client || !accountId) {
      setError('Client or address not available');
      return;
    }

    setIsDialogOpen(true);
    setError(null);
    setProgress(null);

    try {
      await createFaucetMintAndConsume(client, accountId, setProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleViewBalances = async () => {
    if (!accountId) return;
    setIsBalanceDialogOpen(true);
  };

  const handleSendClick = async () => {
    if (!accountId) return;
    setIsSendDialogOpen(true);
  };

  const handleSendSubmit = async (
    toAddress: string,
    amount: string,
    faucetId: string
  ) => {
    if (!client || !accountId)
      throw new Error('Client or address not available');
    const result = await send(
      client,
      accountId,
      toAddress,
      faucetId,
      BigInt(amount)
    );
    return result;
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-white via-orange-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white shadow-lg p-8 space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between bg-orange-50 border border-orange-100 p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 wrap-anywhere">
                {isConnected ? address : 'Disconnected'}
              </span>
            </div>
          </div>

          <Button
            onClick={onConnect}
            size="lg"
            className="w-full cursor-pointer wrap-anywhere"
            variant={isConnected ? 'outline' : 'default'}
          >
            <Wallet className="w-4 h-4" />
            <span className="truncate">
              {isConnected ? wallet?.address : 'Connect Wallet'}
            </span>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Actions</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleMintConsume}
              variant="secondary"
              size="lg"
              className="w-full cursor-pointer"
              disabled={!isConnected}
            >
              <Coins className="w-4 h-4" />
              Mint & Consume
            </Button>

            {/* View Balances Button */}
            <Button
              onClick={handleViewBalances}
              variant="secondary"
              size="lg"
              className="w-full cursor-pointer"
              disabled={!isConnected}
            >
              <Eye className="w-4 h-4" />
              View Balances
            </Button>

            {/* Send Button */}
            <Button
              onClick={handleSendClick}
              size="lg"
              className="w-full cursor-pointer"
              disabled={!isConnected}
            >
              <Send className="w-4 h-4" />
              Send
            </Button>
          </div>

          {/* Info Text */}
          {!isConnected && (
            <div className="bg-orange-50 border border-orange-200 p-4">
              <p className="text-sm text-orange-800">
                Connect your wallet to perform actions
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Powered by Miden & Para</p>
        </div>
      </div>

      <MintConsumeDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setProgress(null);
        }}
        progress={progress}
        error={error}
      />

      {isBalanceDialogOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setIsBalanceDialogOpen(false)}
        >
          <div
            className="bg-white p-6 max-w-2xl w-full m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-[#FF5500] mb-4">Balances</h2>
            {balances ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Balance</TableHead>
                    <TableHead>Asset ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map((b, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-bold">{b.balance}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {b.assetId}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div>Loading...</div>
            )}
            <Button
              onClick={() => setIsBalanceDialogOpen(false)}
              className="mt-4 w-full"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {isSendDialogOpen && (
        <SendDialog
          isOpen={isSendDialogOpen}
          onClose={() => setIsSendDialogOpen(false)}
          balances={balances}
          onSend={handleSendSubmit}
        />
      )}
    </div>
  );
}

export default App;
