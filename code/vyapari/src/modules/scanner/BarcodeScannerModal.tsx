import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useStore } from '../../services/store';
import { Camera, CameraOff, CheckCircle2, AlertCircle, Search } from 'lucide-react';

export interface ScanFeedback {
  ok: boolean;
  message: string;
  allowManualFallback?: boolean;
}

export interface BarcodeScannerModalProps {
  title?: string;
  onClose: () => void;
  onScan: (barcode: string) => ScanFeedback | void;
  onManualFallback?: (code: string) => void;
  keepOpenOnSuccess?: boolean;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  title = 'Scan Barcode / QR',
  onClose,
  onScan,
  onManualFallback,
  keepOpenOnSuccess = false,
}) => {
  const products = useStore(state => state.products);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastCameraReadRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  const [cameraState, setCameraState] = useState<'initializing' | 'active' | 'denied' | 'unavailable'>(
    'initializing'
  );
  const [cameraNote, setCameraNote] = useState<string>('');
  const [simulatedCode, setSimulatedCode] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [feedback, setFeedback] = useState<(ScanFeedback & { code: string }) | null>(null);

  const handleDetectedCode = useCallback(
    (rawCode: string) => {
      const code = rawCode.trim();
      if (!code) return;

      const result = onScan(code);
      if (result) {
        setFeedback({ ...result, code });
        if (result.ok && !keepOpenOnSuccess) {
          setTimeout(() => onClose(), 450);
        }
      } else if (!keepOpenOnSuccess) {
        onClose();
      }
    },
    [onScan, keepOpenOnSuccess, onClose]
  );

  // Request camera permission & run BarcodeDetector when supported
  useEffect(() => {
    let cancelled = false;
    let scanTimer: ReturnType<typeof setInterval> | null = null;

    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (!cancelled) {
          setCameraState('unavailable');
          setCameraNote('Camera API is not available in this browser/environment. Use Simulate Scan below.');
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraState('active');

        const BarcodeDetectorCtor = (window as any).BarcodeDetector;
        if (BarcodeDetectorCtor) {
          const detector = new BarcodeDetectorCtor({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
          });
          scanTimer = setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const value = barcodes[0].rawValue;
                const now = Date.now();
                if (
                  value &&
                  (value !== lastCameraReadRef.current.code ||
                    now - lastCameraReadRef.current.at > 1500)
                ) {
                  lastCameraReadRef.current = { code: value, at: now };
                  handleDetectedCode(value);
                }
              }
            } catch {
              // Ignore transient frame decode errors
            }
          }, 350);
        } else {
          setCameraNote(
            'Live camera active. Native BarcodeDetector not supported in this browser — use Simulate Scan below.'
          );
        }
      } catch (err: any) {
        if (!cancelled) {
          const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
          setCameraState(isDenied ? 'denied' : 'unavailable');
          setCameraNote(
            isDenied
              ? 'Camera permission denied. You can still test all scanning flows using Simulate Scan below.'
              : 'No camera detected. Use Simulate Scan below to test barcode scanning.'
          );
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (scanTimer) clearInterval(scanTimer);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [handleDetectedCode]);

  const cornerStyle = (
    top?: number,
    bottom?: number,
    left?: number,
    right?: number
  ): React.CSSProperties => ({
    position: 'absolute',
    width: 24,
    height: 24,
    top,
    bottom,
    left,
    right,
    borderColor: '#c2410c', // On-brand terracotta corner brackets
    borderStyle: 'solid',
    borderWidth: 0,
    borderTopWidth: top !== undefined ? 3 : 0,
    borderBottomWidth: bottom !== undefined ? 3 : 0,
    borderLeftWidth: left !== undefined ? 3 : 0,
    borderRightWidth: right !== undefined ? 3 : 0,
    borderRadius: 2,
    pointerEvents: 'none',
  });

  return (
    <Modal title={title} isOpen={true} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Camera / Scanner Viewport */}
        <div
          style={{
            height: 230,
            backgroundColor: '#111827',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af',
            position: 'relative',
            overflow: 'hidden',
            border: feedback
              ? `2px solid ${feedback.ok ? '#16a34a' : '#dc2626'}`
              : '1px solid var(--color-border)',
            transition: 'border-color 0.2s',
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: cameraState === 'active' ? 'block' : 'none',
            }}
          />

          {cameraState !== 'active' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: 20,
                textAlign: 'center',
              }}
            >
              {cameraState === 'initializing' ? (
                <Camera size={38} style={{ opacity: 0.5 }} />
              ) : (
                <CameraOff size={38} style={{ color: '#c2410c', opacity: 0.85 }} />
              )}
              <span style={{ fontSize: 13, color: '#d1d5db', maxWidth: 300 }}>
                {cameraState === 'initializing'
                  ? 'Requesting camera permission...'
                  : cameraNote}
              </span>
            </div>
          )}

          {/* Terracotta Corner Brackets */}
          <div style={cornerStyle(18, undefined, 24, undefined)} />
          <div style={cornerStyle(18, undefined, undefined, 24)} />
          <div style={cornerStyle(undefined, 18, 24, undefined)} />
          <div style={cornerStyle(undefined, 18, undefined, 24)} />

          {/* Animated Scan Line */}
          <div
            style={{
              position: 'absolute',
              left: 28,
              right: 28,
              height: 2,
              backgroundColor: '#c2410c',
              boxShadow: '0 0 10px rgba(194, 65, 12, 0.85)',
              top: '50%',
              animation: 'scannerSweep 2.2s infinite ease-in-out',
              pointerEvents: 'none',
            }}
          />
          <style>{`
            @keyframes scannerSweep {
              0% { transform: translateY(-76px); }
              50% { transform: translateY(76px); }
              100% { transform: translateY(-76px); }
            }
          `}</style>
        </div>

        {/* Inline Feedback Flash */}
        {feedback && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              backgroundColor: feedback.ok ? '#dcfce7' : '#fee2e2',
              border: `1px solid ${feedback.ok ? '#86efac' : '#fca5a5'}`,
              color: feedback.ok ? '#166534' : '#991b1b',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {feedback.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{feedback.message}</span>
            </div>
            {!feedback.ok && feedback.allowManualFallback && onManualFallback && (
              <button
                type="button"
                onClick={() => {
                  onManualFallback(feedback.code);
                  onClose();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#fff',
                  border: '1px solid #fca5a5',
                  color: '#991b1b',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Search size={12} /> Search manually
              </button>
            )}
          </div>
        )}

        {/* Simulate Scan Controls (identical downstream logic) */}
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            backgroundColor: 'var(--color-background)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted-text)' }}>
            SIMULATE SCAN (SAME DECODE PIPELINE)
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={selectedPreset}
              onChange={e => {
                const val = e.target.value;
                setSelectedPreset(val);
                if (val) {
                  setSimulatedCode(val);
                  handleDetectedCode(val);
                }
              }}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                fontSize: 13,
              }}
            >
              <option value="">Pick a seeded barcode to simulate...</option>
              {products
                .filter(p => p.barcode)
                .map(p => (
                  <option key={p.id} value={p.barcode}>
                    {p.name} ({p.barcode})
                  </option>
                ))}
              <option value="0000000000000">Unrecognized Barcode (0000000000000)</option>
              <option value="INVALID@@CODE">Malformed Barcode (INVALID@@CODE)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              placeholder="Or type/paste barcode value..."
              value={simulatedCode}
              onChange={(e: any) => setSimulatedCode(e.target.value)}
              style={{ flex: 1 }}
              onKeyDown={(e: any) => {
                if (e.key === 'Enter' && simulatedCode.trim()) {
                  e.preventDefault();
                  handleDetectedCode(simulatedCode);
                }
              }}
            />
            <Button
              type="button"
              onClick={() => simulatedCode.trim() && handleDetectedCode(simulatedCode)}
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
            >
              Simulate Scan
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

