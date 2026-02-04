import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, KeyRound } from 'lucide-react';

interface MFAVerificationDialogProps {
  open: boolean;
  onVerify: (code: string, isBackupCode?: boolean) => Promise<void>;
  isVerifying: boolean;
  onCancel: () => void;
}

export function MFAVerificationDialog({
  open,
  onVerify,
  isVerifying,
  onCancel,
}: MFAVerificationDialogProps) {
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleVerify = async () => {
    const minLength = useBackupCode ? 8 : 6;
    if (code.length >= minLength) {
      await onVerify(code, useBackupCode);
      setCode('');
    }
  };

  const toggleBackupCode = () => {
    setCode('');
    setUseBackupCode(!useBackupCode);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            {useBackupCode 
              ? 'Enter one of your backup codes to verify your identity.'
              : 'Enter your 6-digit verification code from your authenticator app.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertDescription className="text-xs">
              🔒 Your account is protected with 2FA. Please verify to continue.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="code">
              {useBackupCode ? 'Backup Code' : 'Verification Code'}
            </Label>
            <Input
              id="code"
              type="text"
              inputMode={useBackupCode ? 'text' : 'numeric'}
              pattern={useBackupCode ? '[A-Z0-9]*' : '[0-9]*'}
              maxLength={useBackupCode ? 8 : 6}
              placeholder={useBackupCode ? 'XXXXXXXX' : '000000'}
              value={code}
              onChange={(e) => setCode(useBackupCode ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') : e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              autoFocus
              className="text-center text-2xl tracking-widest font-mono"
              disabled={isVerifying}
            />
            <p className="text-xs text-muted-foreground text-center">
              {useBackupCode 
                ? 'Enter one of your 8-character backup codes'
                : 'Enter the code from your authenticator app'
              }
            </p>
          </div>

          {/* Toggle between verification code and backup code */}
          <div className="flex items-center justify-center pt-2">
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={toggleBackupCode}
              disabled={isVerifying}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              <KeyRound className="mr-2 h-3 w-3" />
              {useBackupCode 
                ? 'Use authenticator app instead' 
                : 'Lost authenticator app? Use backup code'
              }
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onCancel} 
            disabled={isVerifying}
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            disabled={(useBackupCode ? code.length < 8 : code.length !== 6) || isVerifying}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
