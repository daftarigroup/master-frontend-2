'use client';

import { IconCamera, IconMapPin, IconRefresh, IconX } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { encodePlusCode } from '../utils/plusCode';

export interface GeoPhoto {
  blob: Blob;
  previewUrl: string;
  latitude: number;
  longitude: number;
  plusCode: string | null;
  accuracy: number | null;
  capturedAt: string;
}

interface Props {
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
export default function GeoPhotoCapture({ onCapture, onClear, disabled }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [useFallbackInput, setUseFallbackInput] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);

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
    (source: CanvasImageSource, width: number, height: number, coords: GeolocationCoordinates) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(source, 0, 0, width, height);

      const now = new Date();
      const plusCode = encodePlusCode(coords.latitude, coords.longitude);
      const stampLines = [
        now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' }),
        `Lat ${coords.latitude.toFixed(6)}, Lng ${coords.longitude.toFixed(6)}${
          coords.accuracy ? ` (±${Math.round(coords.accuracy)}m)` : ''
        }`,
        ...(plusCode ? [`Plus Code: ${plusCode}`] : []),
      ];

      const lineHeightFrac = 1 / (stampLines.length + 0.6);
      const barHeight = Math.max(44, height * 0.07 * stampLines.length);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, height - barHeight, width, barHeight);

      const fontSize = Math.max(12, Math.round(width * 0.024));
      ctx.fillStyle = '#ffffff';
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textBaseline = 'middle';
      stampLines.forEach((line, i) => {
        const y = height - barHeight + barHeight * lineHeightFrac * (i + 0.8);
        ctx.fillText(line, width * 0.02, y);
      });

      return { canvas, plusCode };
    },
    []
  );

  const finishCapture = useCallback(
    (canvas: HTMLCanvasElement, plusCode: string | null, coords: GeolocationCoordinates) => {
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
          });
        },
        'image/jpeg',
        0.9
      );
    },
    [onCapture]
  );

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !location) return;
    const result = drawStampedCanvas(video, video.videoWidth, video.videoHeight, location);
    stopStream();
    if (result) finishCapture(result.canvas, result.plusCode, location);
  }, [location, drawStampedCanvas, stopStream, finishCapture]);

  const handleFallbackFile = useCallback(
    async (file: File) => {
      if (!location) return;
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const result = drawStampedCanvas(img, img.naturalWidth, img.naturalHeight, location);
        URL.revokeObjectURL(objectUrl);
        if (result) finishCapture(result.canvas, result.plusCode, location);
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
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <IconMapPin className="h-3 w-3" />
              Lat {location.latitude.toFixed(5)}, Lng {location.longitude.toFixed(5)}
              {(() => {
                const code = encodePlusCode(location.latitude, location.longitude);
                return code ? ` · ${code}` : '';
              })()}
            </p>
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
