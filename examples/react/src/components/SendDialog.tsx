import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Loader2 } from 'lucide-react';

interface SendDialogProps {
  isOpen: boolean;
  onClose: () => void;
  balances: Array<{ assetId: string; balance: string }> | null;
  onSend: (
    toAddress: string,
    amount: string,
    faucetId: string
  ) => Promise<{
    txHash: string;
    performance: {
      executeTransactionTime: number;
      proveTransactionTime: number;
      submitProvenTransactionTime: number;
      newSendTransactionRequestTime: number;
    };
  }>;
}

export function SendDialog({
  isOpen,
  onClose,
  balances,
  onSend,
}: SendDialogProps) {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedFaucet, setSelectedFaucet] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txTime, setTxTime] = useState<number | null>(null);
  const [performance, setPerformance] = useState<{
    executeTransactionTime: number;
    proveTransactionTime: number;
    submitProvenTransactionTime: number;
    newSendTransactionRequestTime: number;
  } | null>(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await onSend(toAddress, amount, selectedFaucet);
      setTxHash(result.txHash);
      setPerformance(result.performance);
      setTxTime(
        (result.performance.executeTransactionTime +
          result.performance.proveTransactionTime +
          result.performance.submitProvenTransactionTime +
          result.performance.newSendTransactionRequestTime) /
          1000
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setToAddress('');
    setAmount('');
    setSelectedFaucet('');
    setTxHash(null);
    setError(null);
    setTxTime(null);
    setPerformance(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={!isLoading && !txHash ? handleClose : undefined}
    >
      <div
        className="bg-white p-6 max-w-md w-full m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-[#FF5500] mb-4">Send</h2>
        {txHash ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 p-4">
              <p className="text-sm font-bold text-green-800 mb-2">
                Transaction Sent!
              </p>
              {txTime !== null && (
                <p className="text-xs text-green-700 mb-3">
                  Total time: {txTime.toFixed(2)}s
                </p>
              )}
              {performance && (
                <div className="mb-3 bg-white p-3 border border-green-200 space-y-1">
                  <p className="text-xs font-bold text-gray-700 mb-2">
                    Breakdown:
                  </p>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Creating the Transaction Request:</span>
                      <span className="font-mono">
                        {performance.newSendTransactionRequestTime.toFixed(2)}{' '}
                        ms
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        Transaction Execution (signing + calculating account
                        delta):
                      </span>
                      <span className="font-mono">
                        {(performance.executeTransactionTime / 1000).toFixed(3)}
                        s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Proving Transaction:</span>
                      <span className="font-mono">
                        {(performance.proveTransactionTime / 1000).toFixed(3)}s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Submitting Transaction:</span>
                      <span className="font-mono">
                        {(
                          performance.submitProvenTransactionTime / 1000
                        ).toFixed(3)}
                        s
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-medium mb-1">Transaction Hash</p>
                <a
                  href={`https://testnet.midenscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono break-all bg-white p-2 border border-gray-200 block hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  {txHash}
                </a>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium block mb-1">
                To Address
              </label>
              <Input
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="0x..."
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Amount</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Asset</label>
              {balances && balances.length > 0 ? (
                <select
                  className="flex h-10 w-full border border-input bg-background px-3 py-2 text-sm"
                  value={selectedFaucet}
                  onChange={(e) => setSelectedFaucet(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">Select asset</option>
                  {balances.map((b, i) => (
                    <option key={i} value={b.assetId}>
                      {b.assetId.slice(0, 20)}... (Balance: {b.balance})
                    </option>
                  ))}
                </select>
              ) : (
                <div>Loading assets...</div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                className="flex-1"
                disabled={!toAddress || !amount || !selectedFaucet || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send'
                )}
              </Button>
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
