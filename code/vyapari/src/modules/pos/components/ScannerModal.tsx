import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Camera } from 'lucide-react';

interface ScannerModalProps {
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ onClose, onScan }) => {
  const [simulatedCode, setSimulatedCode] = useState('');

  return (
    <Modal title="Scan Barcode" isOpen={true} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ 
          height: 240, 
          backgroundColor: '#000', 
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-muted-text)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <Camera size={48} style={{ opacity: 0.2 }} />
          {/* Laser animation simulation */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: 2,
            backgroundColor: 'var(--color-primary)',
            boxShadow: '0 0 8px var(--color-primary)',
            top: '50%',
            animation: 'scan 2s infinite linear'
          }} />
          <style>{`
            @keyframes scan {
              0% { transform: translateY(-100px); }
              50% { transform: translateY(100px); }
              100% { transform: translateY(-100px); }
            }
          `}</style>
        </div>
        
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-muted-text)' }}>
          Camera integration is deferred to Prompt 19. Use the field below to simulate a scanned barcode.
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <Input 
            placeholder="Enter mock barcode..." 
            value={simulatedCode}
            onChange={(e: any) => setSimulatedCode(e.target.value)}
            style={{ flex: 1 }}
            onKeyDown={(e: any) => {
              if (e.key === 'Enter' && simulatedCode) onScan(simulatedCode);
            }}
          />
          <Button onClick={() => simulatedCode && onScan(simulatedCode)} style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
            Simulate
          </Button>
        </div>
      </div>
    </Modal>
  );
};
