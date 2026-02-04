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
import { Loader2, Copy, Check, Download, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface MFASetupDialogProps {
  open: boolean;
  onClose: () => void;
  qrCode: string;
  secret: string;
  factorId: string;
  backupCodes: string[];
  onVerify: (args: { factorId: string; code: string; backupCodes: string[] }) => void;
  isVerifying: boolean;
}

export function MFASetupDialog({
  open,
  onClose,
  qrCode,
  secret,
  factorId,
  backupCodes,
  onVerify,
  isVerifying,
}: MFASetupDialogProps) {
  const [step, setStep] = useState<'scan' | 'verify' | 'backup'>('scan');
  const [verificationCode, setVerificationCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const handleCopySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
    toast.success('Secret key copied to clipboard');
  };

  const handleCopyBackupCodes = async () => {
    const text = backupCodes.join('\n');
    await navigator.clipboard.writeText(text);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
    toast.success('Backup codes copied to clipboard');
  };

  const handleDownloadBackupCodes = () => {
    const text = `KieDex 2FA Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.join('\n')}\n\nKeep these codes safe! Each code can only be used once.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kiedex-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded');
  };

  const handleVerify = () => {
    if (verificationCode.length === 6) {
      onVerify({ factorId, code: verificationCode, backupCodes });
      setStep('backup');
    }
  };

  const handleFinish = () => {
    setStep('scan');
    setVerificationCode('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 'scan' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Set Up Two-Factor Authentication
              </DialogTitle>
              <DialogDescription>
                Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* QR Code */}
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img 
                  src={qrCode} 
                  alt="2FA QR Code" 
                  className="w-48 h-48"
                />
              </div>

              {/* Manual Entry */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Can't scan? Enter this key manually:
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={secret}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopySecret}
                  >
                    {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertDescription className="text-xs">
                  Save this key in a secure place. You'll need it if you lose access to your authenticator app.
                </AlertDescription>
              </Alert>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep('verify')}>
                Next
              </Button>
            </div>
          </>
        )}

        {step === 'verify' && (
          <>
            <DialogHeader>
              <DialogTitle>Verify Your Code</DialogTitle>
              <DialogDescription>
                Enter the 6-digit code from your authenticator app
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Verification Code</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest font-mono"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('scan')}>
                Back
              </Button>
              <Button 
                onClick={handleVerify}
                disabled={verificationCode.length !== 6 || isVerifying}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Enable'
                )}
              </Button>
            </div>
          </>
        )}

        {step === 'backup' && (
          <>
            <DialogHeader>
              <DialogTitle>Save Your Backup Codes</DialogTitle>
              <DialogDescription>
                These codes can be used to access your account if you lose your authenticator device
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertDescription className="text-xs">
                  ⚠️ Save these codes now! They won't be shown again.
                </AlertDescription>
              </Alert>

              <div className="bg-secondary/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {backupCodes.map((code, i) => (
                    <div key={i} className="text-foreground">
                      {i + 1}. {code}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyBackupCodes}
                  className="flex-1"
                >
                  {copiedCodes ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  Copy Codes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadBackupCodes}
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleFinish}>
                Finish Setup
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
