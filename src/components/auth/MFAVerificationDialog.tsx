import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, KeyRound } from 'lucide-react';

interface MFAVerificationDialogProps {
  open: boolean;
  onVerify: (code: string, isBackupCode?: boolean) => Promise<void>;
  onCancel: () => void;
  isVerifying: boolean;
  error?: string;
}

export function MFAVerificationDialog({
  open,
  onVerify,
  onCancel,
  isVerifying,
  error,
}: MFAVerificationDialogProps) {
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleVerify = async () => {
    const minLength = useBackupCode ? 8 : 6;
    if (code.length >= minLength) {
      await onVerify(code, useBackupCode);
    }
  };

  const toggleBackupCode = () => {
    setCode('');
    setUseBackupCode(!useBackupCode);
  };

  const handleCancel = () => {
    setCode('');
    setUseBackupCode(false);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Two-Factor Authentication Required
          </DialogTitle>
          <DialogDescription>
            {useBackupCode 
              ? 'Enter one of your backup codes to verify your identity.'
              : 'Enter the 6-digit code from your authenticator app to continue.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="mfa-code">
              {useBackupCode ? 'Backup Code' : 'Verification Code'}
            </Label>
            <Input
              id="mfa-code"
              type="text"
              inputMode={useBackupCode ? 'text' : 'numeric'}
              pattern={useBackupCode ? '[A-Z0-9]*' : '[0-9]*'}
              maxLength={useBackupCode ? 8 : 6}
              placeholder={useBackupCode ? 'XXXXXXXX' : '000000'}
              value={code}
              onChange={(e) => setCode(useBackupCode ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') : e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              autoFocus
              disabled={isVerifying}
              className="text-center text-2xl tracking-widest font-mono"
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

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isVerifying}>
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
              'Verify & Continue'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
