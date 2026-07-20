import { Camera, CameraOff, Pause, Play, FlipHorizontal, Flashlight, FlashlightOff } from 'lucide-react';

interface ScannerViewportProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  hasPermission: boolean | null;
  cameras: MediaDeviceInfo[];
  selectedCamera: string | undefined;
  onToggle: () => void;
  onSwitchCamera: (id: string) => void;
  orderType: 'verkoop' | 'inkoop';
  torchSupported?: boolean;
  torchOn?: boolean;
  onToggleTorch?: () => void;
}

export default function ScannerViewport({
  videoRef,
  isActive,
  hasPermission,
  cameras,
  selectedCamera,
  onToggle,
  onSwitchCamera,
  orderType,
  torchSupported,
  torchOn,
  onToggleTorch,
}: ScannerViewportProps) {
  const isVerkoop = orderType === 'verkoop';
  const accent = isVerkoop ? 'var(--accent)' : 'var(--inkoop)';
  const glow = isVerkoop ? 'var(--accent-glow-md)' : 'var(--inkoop-glow)';
  const btnBg = isVerkoop ? 'var(--accent)' : 'var(--inkoop)';
  const btnColor = isVerkoop ? '#030712' : '#ffffff';

  const bracketSize = 28;
  const bracketThickness = 3;

  const corner = (pos: 'tl' | 'tr' | 'bl' | 'br') => {
    const isTop = pos.startsWith('t');
    const isLeft = pos.endsWith('l');
    return (
      <div style={{
        position: 'absolute',
        width: bracketSize, height: bracketSize,
        ...(isTop ? { top: 0 } : { bottom: 0 }),
        ...(isLeft ? { left: 0 } : { right: 0 }),
        animation: isActive ? 'bracketAnim 2s ease-in-out infinite' : 'none',
        animationDelay: `${pos === 'tl' ? 0 : pos === 'tr' ? 200 : pos === 'bl' ? 400 : 600}ms`,
      }}>
        {/* Horizontal */}
        <div style={{
          position: 'absolute',
          height: bracketThickness,
          width: bracketSize,
          background: accent,
          boxShadow: `0 0 12px ${accent}, 0 0 24px ${glow}`,
          borderRadius: 99,
          ...(isTop ? { top: 0 } : { bottom: 0 }),
          left: 0,
        }} />
        {/* Vertical */}
        <div style={{
          position: 'absolute',
          width: bracketThickness,
          height: bracketSize,
          background: accent,
          boxShadow: `0 0 12px ${accent}, 0 0 24px ${glow}`,
          borderRadius: 99,
          ...(isLeft ? { left: 0 } : { right: 0 }),
          top: 0,
        }} />
      </div>
    );
  };

  return (
    <div style={{ padding: '0 20px' }}>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="btn-glass"
        style={{
          width: '100%',
          minHeight: 44,
          marginBottom: 10,
          padding: '13px 0',
          borderRadius: 14,
          background: isActive
            ? 'rgba(15,23,42,0.8)'
            : btnBg,
          color: isActive ? 'var(--text-2)' : btnColor,
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: '-0.01em',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          border: isActive ? '1px solid var(--border-2)' : 'none',
          boxShadow: isActive ? 'none' : `0 0 24px ${glow}, 0 4px 16px rgba(0,0,0,0.3)`,
          transition: 'all 0.3s var(--ease)',
        } as React.CSSProperties}
      >
        {isActive
          ? <><Pause size={17} /> Pauzeer scanner</>
          : <><Play size={17} /> Start scanner</>
        }
      </button>

      <div style={{
        position: 'relative',
        borderRadius: 20,
        overflow: 'hidden',
        background: '#000',
        aspectRatio: '3/4',
        maxHeight: 'min(60vh, 460px)',
        border: isActive ? `1px solid ${accent}40` : '1px solid var(--border-2)',
        boxShadow: isActive
          ? `var(--glass-shadow), 0 0 32px ${glow}`
          : 'var(--glass-shadow)',
        transition: 'all 0.4s var(--ease)',
      }}>
        {/* Video */}
        <video
          ref={videoRef}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            display: isActive ? 'block' : 'none',
          }}
          playsInline muted
        />

        {/* Offline placeholder */}
        {!isActive && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 10,
            background: 'linear-gradient(135deg, #030712 0%, #0B132B 100%)',
          }}>
            {hasPermission === false
              ? <CameraOff size={36} color="var(--text-3)" aria-hidden="true" />
              : <Camera size={36} color="var(--text-3)" aria-hidden="true" />
            }
            <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: '0 24px' }}>
              {hasPermission === false ? 'Camera toegang geweigerd' : 'Camera staat uit'}
            </p>
            {hasPermission === false && (
              <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 11, textAlign: 'center', padding: '0 24px', maxWidth: 260 }}>
                Geef deze site camera-toegang via de site-instellingen van je browser (meestal het slotje/i-icoon naast de adresbalk) en herlaad de pagina.
              </p>
            )}
          </div>
        )}

        {/* Scanner overlay — only when active */}
        {isActive && (
          <>
            {/* Dark vignette */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at center, transparent 40%, rgba(3,7,18,0.55) 100%)',
              pointerEvents: 'none',
            }} />

            {/* Scan zone */}
            <div style={{
              position: 'absolute',
              top: '15%', left: '10%', right: '10%', bottom: '15%',
              pointerEvents: 'none',
            }}>
              {/* Corner brackets */}
              {corner('tl')} {corner('tr')} {corner('bl')} {corner('br')}

              {/* Laser line */}
              <div style={{
                position: 'absolute',
                left: bracketThickness, right: bracketThickness,
                height: 2,
                background: `linear-gradient(90deg, transparent 0%, ${accent} 20%, ${accent} 80%, transparent 100%)`,
                boxShadow: `0 0 12px ${accent}, 0 0 24px ${glow}`,
                borderRadius: 99,
                animation: 'laserScan 2.4s var(--ease) infinite',
                top: bracketSize,
              }} />
            </div>

            {/* Scanning label */}
            <div style={{
              position: 'absolute', bottom: 12, left: 0, right: 0,
              display: 'flex', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{
                background: 'rgba(3,7,18,0.7)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${accent}30`,
                borderRadius: 20,
                padding: '4px 14px',
                fontSize: 11,
                fontWeight: 600,
                color: accent,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                Scanning…
              </div>
            </div>
          </>
        )}

        {/* Controls overlay */}
        <div style={{
          position: 'absolute', bottom: 12, right: 12,
          display: 'flex', gap: 8,
        }}>
          {isActive && torchSupported && onToggleTorch && (
            <button
              onClick={onToggleTorch}
              aria-label={torchOn ? 'Flash uitschakelen' : 'Flash inschakelen'}
              aria-pressed={torchOn}
              style={{
                width: 44, height: 44,
                background: torchOn ? accent : 'rgba(3,7,18,0.7)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${torchOn ? accent : 'var(--border-2)'}`,
                borderRadius: 12,
                color: torchOn ? '#030712' : 'var(--text-2)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {torchOn ? <Flashlight size={17} /> : <FlashlightOff size={17} />}
            </button>
          )}
          {cameras.length > 1 && (
            <button
              onClick={() => {
                const other = cameras.find((c) => c.deviceId !== selectedCamera);
                if (other) onSwitchCamera(other.deviceId);
              }}
              aria-label="Wissel van camera"
              style={{
                width: 44, height: 44,
                background: 'rgba(3,7,18,0.7)',
                backdropFilter: 'blur(8px)',
                border: '1px solid var(--border-2)',
                borderRadius: 12,
                color: 'var(--text-2)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <FlipHorizontal size={17} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
