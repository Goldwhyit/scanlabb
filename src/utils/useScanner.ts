import { useRef, useCallback, useEffect, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface UseScannerOptions {
  onScan: (barcode: string) => void;
  onError?: (err: string) => void;
  debounceMs?: number;
}

export function useScanner({ onScan, onError, debounceMs = 1200 }: UseScannerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScanRef = useRef<{ code: string; ts: number }>({ code: '', ts: 0 });
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(undefined);

  const getReader = () => {
    if (!readerRef.current) {
      readerRef.current = new BrowserMultiFormatReader();
    }
    return readerRef.current;
  };

  const stopReader = useCallback(() => {
    readerRef.current?.reset();
    setIsActive(false);
  }, []);

  const refreshCameras = useCallback(async (): Promise<MediaDeviceInfo[]> => {
    let devices: MediaDeviceInfo[] = [];

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      const all = await navigator.mediaDevices.enumerateDevices();
      devices = all.filter((d) => d.kind === 'videoinput');
    }

    if (devices.length === 0) {
      const readerDevices = await getReader().listVideoInputDevices();
      devices = readerDevices;
    }

    setCameras(devices);

    if (!selectedCamera || !devices.some((d) => d.deviceId === selectedCamera)) {
      const preferred =
        devices.find((d) => /back|rear|environment/i.test(d.label))?.deviceId ??
        devices[devices.length - 1]?.deviceId;
      setSelectedCamera(preferred);
    }

    return devices;
  }, [selectedCamera]);

  const startReader = useCallback(async (deviceId?: string) => {
    if (!videoRef.current) return;
    try {
      const reader = getReader();

      const devices = await refreshCameras();

      // Prefer back/environment camera
      const preferred =
        deviceId ??
        devices.find((d) => /back|rear|environment/i.test(d.label))?.deviceId ??
        devices[devices.length - 1]?.deviceId ??
        undefined;

      setSelectedCamera(preferred);
      setHasPermission(true);
      setIsActive(true);

      await reader.decodeFromVideoDevice(
        preferred ?? null,
        videoRef.current,
        (result, err) => {
          if (result) {
            const code = result.getText();
            const now = Date.now();
            if (
              code === lastScanRef.current.code &&
              now - lastScanRef.current.ts < debounceMs
            ) return;
            lastScanRef.current = { code, ts: now };
            if (navigator.vibrate) navigator.vibrate(50);
            onScan(code);
          }
          if (err && !(err instanceof NotFoundException)) {
            // Non-fatal scanner errors — ignore
          }
        }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/permission|notallowed/i.test(msg)) setHasPermission(false);
      onError?.(msg);
      setIsActive(false);
    }
  }, [onScan, onError, debounceMs, refreshCameras]);

  const toggleScan = useCallback(async () => {
    if (isActive) {
      stopReader();
    } else {
      await startReader(selectedCamera);
    }
  }, [isActive, startReader, stopReader, selectedCamera]);

  const switchCamera = useCallback(async (deviceId: string) => {
    stopReader();
    setSelectedCamera(deviceId);
    setTimeout(() => startReader(deviceId), 300);
  }, [startReader, stopReader]);

  useEffect(() => {
    refreshCameras().catch(() => undefined);

    const handleDeviceChange = () => {
      refreshCameras().catch(() => undefined);
    };

    navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange);

    return () => {
      readerRef.current?.reset();
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange);
    };
  }, [refreshCameras]);

  return {
    videoRef,
    isActive,
    hasPermission,
    cameras,
    selectedCamera,
    startReader,
    stopReader,
    toggleScan,
    switchCamera,
  };
}
