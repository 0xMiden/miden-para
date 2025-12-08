import { Loader2, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { type MintAndConsumeProgress, MintAndConsumeStage } from '../lib/types';

interface MintConsumeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  progress: MintAndConsumeProgress | null;
  error: string | null;
}

export function MintConsumeDialog({
  isOpen,
  onClose,
  progress,
  error,
}: MintConsumeDialogProps) {
  const getStageMessage = (stage: MintAndConsumeStage) => {
    switch (stage) {
      case MintAndConsumeStage.CreatingFaucet:
        return 'Creating faucet...';
      case MintAndConsumeStage.CreatedFaucet:
        return 'Faucet created successfully!';
      case MintAndConsumeStage.MintingTokens:
        return 'Minting tokens...';
      case MintAndConsumeStage.MintedTokens:
        return 'Tokens minted successfully!';
      case MintAndConsumeStage.ConsumingTokens:
        return 'Consuming tokens...';
      case MintAndConsumeStage.ConsumedTokens:
        return 'Tokens consumed successfully!';
      default:
        return 'Processing...';
    }
  };

  const getCurrentStageIndex = () => {
    if (!progress) return -1;
    const stages = [
      MintAndConsumeStage.CreatingFaucet,
      MintAndConsumeStage.CreatedFaucet,
      MintAndConsumeStage.MintingTokens,
      MintAndConsumeStage.MintedTokens,
      MintAndConsumeStage.ConsumingTokens,
      MintAndConsumeStage.ConsumedTokens,
    ];
    return stages.indexOf(progress.stage);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#FF5500]">
            Mint & Consume Process
          </DialogTitle>
          <DialogDescription>
            Track the progress of your mint and consume transaction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error ? (
            <div className="bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-800 font-medium">Error</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          ) : progress ? (
            <>
              {/* Current Stage */}
              <div className="flex items-center gap-4 p-4 bg-orange-50 border-2 border-[#FF5500]">
                <div className="w-8 h-8 shrink-0">
                  {progress.stage === MintAndConsumeStage.ConsumedTokens ? (
                    <div className="w-8 h-8 bg-[#FF5500] flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <Loader2 className="w-8 h-8 text-[#FF5500] animate-spin" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {getStageMessage(progress.stage)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Step {getCurrentStageIndex() + 1} of 6
                  </p>
                </div>
              </div>

              {/* Transaction Details - Always visible */}
              <div className="space-y-3 bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Transaction Details
                </p>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#FF5500]">
                    Faucet ID
                  </p>
                  <p className="text-xs text-gray-700 font-mono break-all bg-white p-2 border border-gray-200">
                    {progress.faucetId || 'Pending...'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#FF5500]">
                    Mint Transaction
                  </p>
                  {progress.mintTxHash ? (
                    <a
                      href={`https://testnet.midenscan.com/tx/${progress.mintTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-700 font-mono break-all bg-white p-2 border border-gray-200 block hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      {progress.mintTxHash}
                    </a>
                  ) : (
                    <p className="text-xs text-gray-700 font-mono break-all bg-white p-2 border border-gray-200">
                      Pending...
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#FF5500]">
                    Consume Transaction
                  </p>
                  {progress.consumeTxHash ? (
                    <a
                      href={`https://testnet.midenscan.com/tx/${progress.consumeTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-700 font-mono break-all bg-white p-2 border border-gray-200 block hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      {progress.consumeTxHash}
                    </a>
                  ) : (
                    <p className="text-xs text-gray-700 font-mono break-all bg-white p-2 border border-gray-200">
                      Pending...
                    </p>
                  )}
                </div>
              </div>

              {progress.stage === MintAndConsumeStage.ConsumedTokens && (
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={onClose}
                    size="lg"
                    className="bg-[#FF5500] hover:bg-[#FF5500]/90"
                  >
                    Close
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-[#FF5500] animate-spin mb-4" />
              <p className="text-sm text-gray-600">Initializing...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { MintAndConsumeProgress };
export { MintAndConsumeStage };
