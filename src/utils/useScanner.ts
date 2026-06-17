import { useRef, useCallback, useEffect, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException, BarcodeFormat, DecodeHintType } from '@zxing/library';

interface UseScannerOptions {
  onScan: (barcode: string) => void;
  onError?: (err: string) => void;
  debounceMs?: number;
  formats?: string[];
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
  const lastRef = useRef<{ code: string; ts: number }>({ code: '', ts: 0 });
  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>();

  const getReader = () => {
    if (readerRef.current) return readerRef.current;
    const possible = mapFormatsToBarcodeEnums(formats);
    const hints = new Map();
    if (possible) hints.set(DecodeHintType.POSSIBLE_FORMATS, possible);
    readerRef.current = new BrowserMultiFormatReader(hints);
    return readerRef.current;
  };

  const stopReader = useCallback(() => {
    readerRef.current?.reset();
    setIsActive(false);
  }, []);

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
      setHasPermission(true);
      setIsActive(true);
      await reader.decodeFromVideoDevice(preferred ?? null, videoRef.current, (result, err) => {
        if (result) {
          const code = result.getText();
          const now = Date.now();
          if (code === lastRef.current.code && now - lastRef.current.ts < debounceMs) return;
          lastRef.current = { code, ts: now };
          if (navigator.vibrate) navigator.vibrate(60);
          onScan(code);
        }
        if (err && !(err instanceof NotFoundException)) { /* ignore frame errors */ }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/permission|notallowed/i.test(msg)) setHasPermission(false);
      onError?.(msg);
      setIsActive(false);
    }
  }, [onScan, onError, debounceMs]);

  const toggleScan = useCallback(async () => {
    if (isActive) stopReader(); else await startReader(selectedCamera);
  }, [isActive, startReader, stopReader, selectedCamera]);

  const switchCamera = useCallback(async (id: string) => {
    stopReader();
    setSelectedCamera(id);
    setTimeout(() => startReader(id), 300);
  }, [startReader, stopReader]);

  useEffect(() => () => { readerRef.current?.reset(); }, []);

  return { videoRef, isActive, hasPermission, cameras, selectedCamera, startReader, stopReader, toggleScan, switchCamera };
}
