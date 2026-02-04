import { memo, useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ExternalLink,
  Check,
  DollarSign,
  Loader2,
  Send,
  AtSign,
  Repeat2,
  Globe,
  type LucideIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { validateProof, getProofPlaceholder, getProofHelpText } from '@/lib/proofValidation';
import type { TaskWithProgress } from '@/hooks/useSocialTasks';

const WAITING_PROOF_KEY = 'social_tasks_waiting_proof';

// Icon mapping for task types
const TASK_ICONS: Record<string, LucideIcon> = {
  send: Send,
  at_sign: AtSign,
  repeat: Repeat2,
  globe: Globe,
};

// Get waiting proof tasks from localStorage
const getWaitingProofTasks = (): string[] => {
  try {
    const stored = localStorage.getItem(WAITING_PROOF_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save waiting proof task to localStorage
const setWaitingProofTask = (taskId: string, waiting: boolean) => {
  try {
    const tasks = getWaitingProofTasks();
    if (waiting && !tasks.includes(taskId)) {
      localStorage.setItem(WAITING_PROOF_KEY, JSON.stringify([...tasks, taskId]));
    } else if (!waiting) {
      localStorage.setItem(WAITING_PROOF_KEY, JSON.stringify(tasks.filter(id => id !== taskId)));
    }
  } catch {
    // Ignore storage errors
  }
};

interface SocialTaskCardProps extends TaskWithProgress {
  onSubmitProof: (args: { taskId: string; proofValue: string; proofType: string }) => void;
  onClaimReward: (taskId: string) => void;
  isSubmitting: boolean;
  isClaiming: boolean;
}

export const SocialTaskCard = memo(function SocialTaskCard({
  task_id,
  name,
  description,
  reward,
  reward_type,
  link,
  icon_name,
  proof_type,
  status,
  proofValue,
  onSubmitProof,
  onClaimReward,
  isSubmitting,
  isClaiming,
}: SocialTaskCardProps) {
  // Initialize from localStorage if task was started but not submitted
  const [isWaitingProof, setIsWaitingProof] = useState(() => {
    if (status !== 'idle') return false;
    return getWaitingProofTasks().includes(task_id);
  });
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Get icon component
  const IconComponent = TASK_ICONS[icon_name] || Send;

  // Get reward label
  const getRewardLabel = () => {
    switch (reward_type) {
      case 'oil':
        return `+${reward} Oil`;
      case 'kdx':
        return `+${reward} KDX`;
      default:
        return `+${reward} USDT`;
    }
  };

  // Clear waiting state from localStorage when task is no longer idle
  useEffect(() => {
    if (status !== 'idle') {
      setWaitingProofTask(task_id, false);
      setIsWaitingProof(false);
    }
  }, [task_id, status]);

  const handleStart = useCallback(() => {
    // Open link in new tab
    try {
      window.open(link, '_blank', 'noopener,noreferrer');
    } catch {
      const a = document.createElement('a');
      a.href = link;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    }

    // Show proof input form and persist to localStorage
    setIsWaitingProof(true);
    setWaitingProofTask(task_id, true);
    setValidationError(null);
  }, [task_id, link]);

  const handleSubmit = useCallback(() => {
    if (!inputValue.trim()) {
      setValidationError('Please enter your proof');
      return;
    }

    // Validate proof format
    const validation = validateProof(proof_type, inputValue);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid format');
      toast.error(validation.error || 'Invalid proof format');
      return;
    }

    setValidationError(null);
    onSubmitProof({
      taskId: task_id,
      proofValue: inputValue.trim(),
      proofType: proof_type,
    });
  }, [task_id, inputValue, proof_type, onSubmitProof]);

  const handleClaim = useCallback(() => {
    if (status !== 'completed' || isClaiming) return;
    onClaimReward(task_id);
  }, [task_id, status, isClaiming, onClaimReward]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (validationError) setValidationError(null);
  }, [validationError]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      handleSubmit();
    }
  }, [handleSubmit, isSubmitting]);

  // Determine what to render based on status and local state
  const showProofForm = isWaitingProof && status === 'idle';
  const effectiveStatus = showProofForm ? 'waitingProof' : status;

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-3 lg:p-4">
        <div className="flex items-start gap-3">
          {/* Icon Container */}
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
            <IconComponent className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4 mb-1">
              <h4 className="font-medium text-foreground text-sm lg:text-base truncate min-w-0">{name}</h4>
              <Badge variant="secondary" className="shrink-0 gap-1 text-xs whitespace-nowrap">
                <DollarSign className="w-3 h-3" />
                {getRewardLabel()}
              </Badge>
            </div>
            <p className="text-xs lg:text-sm text-muted-foreground mb-3 truncate">{description}</p>

            {/* Claimed State */}
            {effectiveStatus === 'claimed' && (
              <Badge variant="default" className="bg-primary/20 text-primary border-primary/30 gap-1">
                <Check className="w-3 h-3" />
                Claimed
              </Badge>
            )}

            {/* Completed State - Ready to claim */}
            {effectiveStatus === 'completed' && (
              <div className="flex flex-wrap gap-2 items-center lg:justify-end">
                <Badge variant="outline" className="gap-1 text-primary border-primary/30">
                  <Check className="w-3 h-3" />
                  Verified
                </Badge>
                <Button
                  size="sm"
                  onClick={handleClaim}
                  disabled={isClaiming}
                  className="gap-1.5"
                >
                  {isClaiming ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    'Claim Reward'
                  )}
                </Button>
              </div>
            )}

            {/* Submitted State - Pending review (if we use pending status) */}
            {effectiveStatus === 'submitted' && (
              <div className="space-y-2">
                <Badge variant="secondary" className="gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Pending Review
                </Badge>
                {proofValue && (
                  <p className="text-xs text-muted-foreground truncate">
                    Submitted: {proofValue}
                  </p>
                )}
              </div>
            )}

            {/* Waiting for Proof State - Show input form */}
            {effectiveStatus === 'waitingProof' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder={getProofPlaceholder(proof_type)}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={isSubmitting}
                    className={`text-sm ${validationError ? 'border-destructive' : ''}`}
                  />
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !inputValue.trim()}
                    className="gap-1.5 shrink-0"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="hidden sm:inline">Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3" />
                        <span className="hidden sm:inline">Submit</span>
                      </>
                    )}
                  </Button>
                </div>
                <p className={`text-xs ${validationError ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {validationError || getProofHelpText(proof_type)}
                </p>
              </div>
            )}

            {/* Idle State - Not started */}
            {effectiveStatus === 'idle' && (
              <div className="lg:flex lg:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStart}
                  className="gap-1.5 w-full sm:w-auto"
                >
                  Start <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
