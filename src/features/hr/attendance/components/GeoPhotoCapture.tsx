'use client';

import { IconCamera, IconMapPin, IconRefresh, IconX } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { encodePlusCode } from '../utils/plusCode';
import { getPreciseLocationAddress } from '../utils/reverseGeocode';

export interface GeoPhoto {
  blob: Blob;
  previewUrl: string;
  latitude: number;
  longitude: number;
  plusCode: string | null;
  accuracy: number | null;
  capturedAt: string;
  address?: string | null;
}

interface Props {
  /** Current captured photo object or null to reset/clear. */
  value?: GeoPhoto | null;
  /** Called once a photo has been captured with its location burned in. */
  onCapture: (photo: GeoPhoto) => void;
  /** Called when the captured photo is cleared/retaken. */
  onClear?: () => void;
  disabled?: boolean;
}

type Stage = 'idle' | 'locating' | 'live' | 'captured' | 'error';

/**
 * Mandatory proof-of-presence capture: gets the device's GPS location, opens
 * the camera, and burns the coordinates + timestamp into the photo itself
 * (via canvas) before handing a Blob back to the caller — so the location
 * travels with the image rather than being a separate, easily-mismatched
 * field. Falls back to the OS's native camera/file picker
 * (<input capture="environment">) if getUserMedia isn't available (older
 * browsers, some desktop setups).
 */
export default function GeoPhotoCapture({ value, onCapture, onClear, disabled }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [useFallbackInput, setUseFallbackInput] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const addressRef = useRef<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopStream, [stopStream]);
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  // Synchronize internal capture state when parent resets or provides value
  useEffect(() => {
    if (value === null) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPreview(null);
      setLocation(null);
      setAddress(null);
      addressRef.current = null;
      setStage((prev) => (prev === 'captured' ? 'idle' : prev));
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else if (value && value.previewUrl) {
      setPreview(value.previewUrl);
      setStage('captured');
    }
  }, [value]);

  const getLocation = useCallback((): Promise<GeolocationCoordinates> => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('This device/browser does not support location — cannot mark attendance.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => {
          const msg =
            err.code === err.PERMISSION_DENIED
              ? 'Location permission denied. Please allow location access to submit attendance.'
              : 'Could not get the current location. Please try again.';
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setStage('locating');
    try {
      const coords = await getLocation();
      setLocation(coords);

      // Pre-fetch precise human-readable address in the background so it is ready on capture
      getPreciseLocationAddress(coords.latitude, coords.longitude).then((resolvedAddr) => {
        if (resolvedAddr) {
          setAddress(resolvedAddr);
          addressRef.current = resolvedAddr;
        }
      });

      if (!navigator.mediaDevices?.getUserMedia) {
        // No camera API (older browser) — fall back to the native picker.
        setUseFallbackInput(true);
        setStage('idle');
        fileInputRef.current?.click();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setStage('live');
      // Video element mounts this render; attach the stream once it exists.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (err) {
      // Camera permission/hardware failure — still have location, so offer
      // the native file/camera picker instead of blocking the submission.
      if (err instanceof Error && err.message.toLowerCase().includes('location')) {
        setError(err.message);
        setStage('error');
        return;
      }
      setUseFallbackInput(true);
      setStage('idle');
      fileInputRef.current?.click();
    }
  }, [getLocation]);

  const drawStampedCanvas = useCallback(
    async (source: CanvasImageSource, width: number, height: number, coords: GeolocationCoordinates) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Draw captured photo
      ctx.drawImage(source, 0, 0, width, height);

      // Resolve address: use pre-fetched address or fetch now with short timeout
      let locAddress = addressRef.current;
      if (!locAddress) {
        locAddress = await getPreciseLocationAddress(coords.latitude, coords.longitude, 2500);
        if (locAddress) {
          addressRef.current = locAddress;
          setAddress(locAddress);
        }
      }

      const now = new Date();
      const plusCode = encodePlusCode(coords.latitude, coords.longitude);

      const formattedDateTime = now.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      const latDir = coords.latitude >= 0 ? 'N' : 'S';
      const lngDir = coords.longitude >= 0 ? 'E' : 'W';
      const latStr = `${Math.abs(coords.latitude).toFixed(6)}° ${latDir}`;
      const lngStr = `${Math.abs(coords.longitude).toFixed(6)}° ${lngDir}`;
      const accStr = coords.accuracy ? ` (±${Math.round(coords.accuracy)}m)` : '';

      // Responsive font sizing based on photo resolution
      const fontSize = Math.max(12, Math.min(24, Math.round(width * 0.022)));
      const lineHeight = Math.round(fontSize * 1.45);
      const paddingX = Math.round(width * 0.03);
      const maxTextWidth = width - paddingX * 2;

      ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

      // Helper to wrap long lines cleanly
      const wrapText = (text: string): string[] => {
        const words = text.split(' ');
        const wrapped: string[] = [];
        let cur = '';
        for (const w of words) {
          const test = cur ? `${cur} ${w}` : w;
          if (ctx.measureText(test).width <= maxTextWidth) {
            cur = test;
          } else {
            if (cur) wrapped.push(cur);
            cur = w;
          }
        }
        if (cur) wrapped.push(cur);
        return wrapped;
      };

      // Construct visual stamp lines
      const lines: { text: string; isBold?: boolean; color?: string }[] = [];

      // 1. Date & Time
      lines.push({
        text: `📅 Date & Time: ${formattedDateTime}`,
        isBold: true,
        color: '#ffffff',
      });

      // 2. Precise Physical Location / Address
      if (locAddress) {
        const addressLines = wrapText(`📍 Location: ${locAddress}`);
        addressLines.forEach((al, idx) => {
          lines.push({
            text: al,
            isBold: idx === 0,
            color: '#f8fafc',
          });
        });
      }

      // 3. Exact GPS Coordinates
      lines.push({
        text: `🌐 Coordinates: Lat ${latStr}, Lng ${lngStr}${accStr}`,
        color: '#e2e8f0',
      });

      // 4. Plus Code
      if (plusCode) {
        lines.push({
          text: `🏷️ Plus Code: ${plusCode}`,
          color: '#cbd5e1',
        });
      }

      const paddingY = Math.round(fontSize * 1.1);
      const contentHeight = lines.length * lineHeight;
      const barHeight = contentHeight + paddingY * 2;

      // Draw smooth, elegant dark gradient at the bottom
      const gradient = ctx.createLinearGradient(0, height - barHeight - 16, 0, height);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(0.2, 'rgba(15, 23, 42, 0.72)');
      gradient.addColorStop(1, 'rgba(15, 23, 42, 0.92)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, height - barHeight - 16, width, barHeight + 16);

      // Subtle top divider line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = Math.max(1, Math.round(width * 0.0015));
      ctx.beginPath();
      ctx.moveTo(paddingX, height - barHeight);
      ctx.lineTo(width - paddingX, height - barHeight);
      ctx.stroke();

      // Render text with subtle shadow for crystal clear legibility
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;
      ctx.textBaseline = 'top';

      let startY = height - barHeight + paddingY;
      lines.forEach((item) => {
        ctx.font = `${item.isBold ? '600' : '400'} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = item.color || '#ffffff';
        ctx.fillText(item.text, paddingX, startY);
        startY += lineHeight;
      });

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      return { canvas, plusCode, address: locAddress };
    },
    []
  );

  const finishCapture = useCallback(
    (
      canvas: HTMLCanvasElement,
      plusCode: string | null,
      coords: GeolocationCoordinates,
      capturedAddress?: string | null
    ) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setError('Could not process the photo. Please try again.');
            setStage('error');
            return;
          }
          const url = URL.createObjectURL(blob);
          previewUrlRef.current = url;
          setPreview(url);
          setStage('captured');
          onCapture({
            blob,
            previewUrl: url,
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy ?? null,
            plusCode,
            capturedAt: new Date().toISOString(),
            address: capturedAddress ?? null,
          });
        },
        'image/jpeg',
        0.9
      );
    },
    [onCapture]
  );

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !location) return;
    const result = await drawStampedCanvas(video, video.videoWidth, video.videoHeight, location);
    stopStream();
    if (result) finishCapture(result.canvas, result.plusCode, location, result.address);
  }, [location, drawStampedCanvas, stopStream, finishCapture]);

  const handleFallbackFile = useCallback(
    async (file: File) => {
      if (!location) return;
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = async () => {
        const result = await drawStampedCanvas(img, img.naturalWidth, img.naturalHeight, location);
        URL.revokeObjectURL(objectUrl);
        if (result) finishCapture(result.canvas, result.plusCode, location, result.address);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setError('Could not read the selected photo. Please try again.');
        setStage('error');
      };
      img.src = objectUrl;
    },
    [location, drawStampedCanvas, finishCapture]
  );

  const retake = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreview(null);
    setLocation(null);
    setAddress(null);
    addressRef.current = null;
    setStage('idle');
    setError(null);
    onClear?.();
  }, [onClear]);

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFallbackFile(file);
          e.target.value = '';
        }}
      />
      <canvas ref={canvasRef} className="hidden" />

      {stage === 'idle' && !preview && (
        <button
          type="button"
          disabled={disabled}
          onClick={startCamera}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 px-4 py-8 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconCamera className="h-7 w-7" />
          <span className="text-[13px] font-semibold">Take Location Photo</span>
          <span className="text-[11px]">Required to submit attendance</span>
        </button>
      )}

      {stage === 'locating' && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-8 text-muted-foreground">
          <IconMapPin className="h-6 w-6 animate-pulse" />
          <span className="text-[13px]">Getting your location…</span>
        </div>
      )}

      {stage === 'error' && (
        <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-4 text-[13px] text-destructive">
          <p>{error}</p>
          <button
            type="button"
            onClick={startCamera}
            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-[12px] font-semibold hover:bg-destructive/20"
          >
            <IconRefresh className="h-3.5 w-3.5" />
            Try Again
          </button>
        </div>
      )}

      {stage === 'live' && (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-xl border border-border bg-black">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} playsInline muted className="w-full" />
          </div>
          {location && (
            <div className="space-y-0.5 text-[11px] text-muted-foreground">
              {address && (
                <p className="flex items-center gap-1 font-medium text-foreground">
                  <IconMapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">{address}</span>
                </p>
              )}
              <p className="flex items-center gap-1">
                {!address && <IconMapPin className="h-3 w-3" />}
                Lat {location.latitude.toFixed(5)}, Lng {location.longitude.toFixed(5)}
                {(() => {
                  const code = encodePlusCode(location.latitude, location.longitude);
                  return code ? ` · ${code}` : '';
                })()}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={capturePhoto}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground hover:opacity-90"
          >
            <IconCamera className="h-4 w-4" />
            Capture Photo
          </button>
        </div>
      )}

      {stage === 'captured' && preview && (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-xl border border-border">
            <img src={preview} alt="Attendance proof" className="w-full" />
            <button
              type="button"
              disabled={disabled}
              onClick={retake}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
              title="Retake"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={retake}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconRefresh className="h-3.5 w-3.5" />
            Retake Photo
          </button>
        </div>
      )}
    </div>
  );
}
