import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '../../components/ui/Button.js';
import { ZoomIn, ZoomOut, RotateCcw, X, Check } from 'lucide-react';

interface AvatarCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => Promise<void>;
  isLoading?: boolean;
}

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  isLoading = false,
}) => {
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const handleCropChange = (location: { x: number; y: number }) => {
    setCrop(location);
  };

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const onCropCompleteCallback = useCallback((_croppedArea: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      // Create cropped image blob on an off-screen canvas
      const image = new Image();
      image.src = imageSrc;
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      canvas.toBlob(
        async (blob) => {
          if (blob) {
            await onCropComplete(blob);
          }
        },
        'image/jpeg',
        0.92
      );
    } catch {
      // ignore
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'var(--bg-panel)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Position & Crop Profile Picture
          </h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Cropper Area */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '320px',
            backgroundColor: '#11161d',
          }}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={handleCropChange}
            onZoomChange={handleZoomChange}
            onCropComplete={onCropCompleteCallback}
          />
        </div>

        {/* Zoom Controls Bar */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <ZoomOut size={16} color="var(--text-muted)" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            style={{
              flex: 1,
              accentColor: 'var(--brand-primary)',
              cursor: 'pointer',
            }}
          />
          <ZoomIn size={16} color="var(--text-muted)" />
          <button
            onClick={handleReset}
            title="Reset position and zoom"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-default)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>

        {/* Footer Actions: Cancel, Save */}
        <div
          style={{
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            backgroundColor: 'var(--bg-panel)',
          }}
        >
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isLoading}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} />
              Save Photo
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};
