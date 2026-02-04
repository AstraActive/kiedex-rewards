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
import { Loader2, AlertTriangle, KeyRound } from 'lucide-react';

interface MFADisableDialogProps {
  open: boolean;
  onClose: () => void;
  onDisable: (code: string, isBackupCode?: boolean) => void;
  isDisabling: boolean;
}

export function MFADisableDialog({
  open,
  onClose,
  onDisable,
  isDisabling,
}: MFADisableDialogProps) {
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleDisable = () => {
    const minLength = useBackupCode ? 8 : 6;
    if (code.length >= minLength) {
      onDisable(code, useBackupCode);
      setCode('');
    }
  };

  const handleClose = () => {
    setCode('');
    setUseBackupCode(false);
    onClose();
  };

  const toggleBackupCode = () => {
    setCode('');
    setUseBackupCode(!useBackupCode);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Disable Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            {useBackupCode 
              ? 'Enter one of your backup codes to confirm.'
              : 'Enter your 6-digit verification code from your authenticator app to confirm.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertDescription className="text-xs">
              Disabling 2FA will remove an important layer of security from your account.
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
              onKeyDown={(e) => e.key === 'Enter' && handleDisable()}
              autoFocus
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
              disabled={isDisabling}
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
          <Button variant="outline" onClick={handleClose} disabled={isDisabling}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDisable}
            disabled={(useBackupCode ? code.length < 8 : code.length !== 6) || isDisabling}
          >
            {isDisabling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disabling...
              </>
            ) : (
              'Disable 2FA'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
