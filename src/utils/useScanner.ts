import { useRef, useCallback, useEffect, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException, BarcodeFormat, DecodeHintType } from '@zxing/library';

interface UseScannerOptions {
  onScan: (barcode: string, format?: string) => void;
  onError?: (err: string) => void;
  debounceMs?: number;
  formats?: string[];
}

// Time-to-next-scan-attempt after a successful decode (ZXing default is 500ms;
// lowered so the next, different barcode is picked up faster in continuous mode).
const TIME_BETWEEN_SCANS_MS = 200;

// MediaTrackCapabilities/-ConstraintSet in lib.dom.d.ts don't include the
// Image Capture API's torch field, so it's declared explicitly here.
interface TorchCapableTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}
interface TorchConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean;
  focusMode?: 'continuous' | 'manual' | 'single-shot';
}
interface TorchCapableTrackConstraints extends MediaTrackConstraints {
  advanced?: TorchConstraintSet[];
}

function mapFormatsToBarcodeEnums(formats?: string[]) {
  if (!formats || formats.length === 0) return undefined;
  const map: BarcodeFormat[] = [];
  for (const f of formats) {
    switch (f) {
      case 'EAN_13': map.push(BarcodeFormat.EAN_13); break;
      case 'GS1_128':
      case 'CODE_128': map.push(BarcodeFormat.CODE_128); break;
      case 'UPC_A': map.push(BarcodeFormat.UPC_A); break;
      case 'QR_CODE': map.push(BarcodeFormat.QR_CODE); break;
      default: break;
    }
  }
  return map.length > 0 ? map : undefined;
}

export function useScanner({ onScan, onError, debounceMs = 1200, formats }: UseScannerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastRef = useRef<{ code: string; ts: number }>({ code: '', ts: 0 });
  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>();
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const getReader = () => {
    if (readerRef.current) return readerRef.current;
    const possible = mapFormatsToBarcodeEnums(formats);
    const hints = new Map();
    // TRY_HARDER: matches ZXing's MultiFormatReader strategy of scanning far more
    // rows/orientations at the cost of speed — worth it for handheld camera scans.
    hints.set(DecodeHintType.TRY_HARDER, true);
    if (possible) hints.set(DecodeHintType.POSSIBLE_FORMATS, possible);
    if (possible?.includes(BarcodeFormat.CODE_128)) hints.set(DecodeHintType.ASSUME_GS1, true);
    readerRef.current = new BrowserMultiFormatReader(hints, TIME_BETWEEN_SCANS_MS);
    return readerRef.current;
  };

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setTorchSupported(false);
    setTorchOn(false);
  }, []);

  const stopReader = useCallback(() => {
    readerRef.current?.reset();
    releaseStream();
    setIsActive(false);
  }, [releaseStream]);

  const startReader = useCallback(async (deviceId?: string) => {
    if (!videoRef.current) return;
    try {
      // recreate reader to respect formats in options
      if (readerRef.current) {
        readerRef.current.reset();
        readerRef.current = null;
      }
      const reader = getReader();
      const devices = await reader.listVideoInputDevices();
      setCameras(devices);
      const preferred = deviceId
        ?? devices.find((d) => /back|rear|environment/i.test(d.label))?.deviceId
        ?? devices[devices.length - 1]?.deviceId;
      setSelectedCamera(preferred);

      // Acquire the stream ourselves (instead of decodeFromVideoDevice) so the
      // MediaStreamTrack stays reachable afterwards for torch/focus control.
      const videoConstraints: TorchCapableTrackConstraints = preferred
        ? { deviceId: { exact: preferred }, advanced: [{ focusMode: 'continuous' }] }
        : { facingMode: 'environment', advanced: [{ focusMode: 'continuous' }] };
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
      streamRef.current = stream;
      setHasPermission(true);
      setIsActive(true);

      const track = stream.getVideoTracks()[0];
      const capabilities = track?.getCapabilities?.() as TorchCapableTrackCapabilities | undefined;
      setTorchSupported(Boolean(capabilities?.torch));

      await reader.decodeFromStream(stream, videoRef.current, (result, err) => {
        if (result) {
          const code = result.getText();
          const now = Date.now();
          if (code === lastRef.current.code && now - lastRef.current.ts < debounceMs) return;
          lastRef.current = { code, ts: now };
          if (navigator.vibrate) navigator.vibrate(60);
          onScan(code, BarcodeFormat[result.getBarcodeFormat()]);
        }
        if (err && !(err instanceof NotFoundException)) { /* ignore frame errors */ }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/permission|notallowed/i.test(msg)) setHasPermission(false);
      onError?.(msg);
      releaseStream();
      setIsActive(false);
    }
  }, [onScan, onError, debounceMs, releaseStream]);

  const toggleScan = useCallback(async () => {
    if (isActive) stopReader(); else await startReader(selectedCamera);
  }, [isActive, startReader, stopReader, selectedCamera]);

  const switchCamera = useCallback(async (id: string) => {
    stopReader();
    setSelectedCamera(id);
    setTimeout(() => startReader(id), 300);
  }, [startReader, stopReader]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !torchSupported) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next } as TorchConstraintSet] });
      setTorchOn(next);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : String(err));
    }
  }, [torchOn, torchSupported, onError]);

  useEffect(() => () => { readerRef.current?.reset(); releaseStream(); }, [releaseStream]);

  return {
    videoRef, isActive, hasPermission, cameras, selectedCamera,
    torchSupported, torchOn, toggleTorch,
    startReader, stopReader, toggleScan, switchCamera,
  };
}
