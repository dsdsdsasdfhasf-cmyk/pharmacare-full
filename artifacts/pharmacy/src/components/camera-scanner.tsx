import { useRef, useEffect, useState } from "react";
import { useZxing } from "react-zxing";
import { Camera, CameraOff, FlipHorizontal } from "lucide-react";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface CameraScannerProps {
  onResult: (barcode: string) => void;
  onError?: (msg: string) => void;
}

export function CameraScanner({ onResult, onError }: CameraScannerProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [active, setActive] = useState(true);
  const lastScanned = useRef<string>("");
  const cooldown = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((all) => {
      const cams = all.filter((d) => d.kind === "videoinput");
      setDevices(cams);
      if (cams.length > 0 && !deviceId) {
        const back = cams.find((c) => /back|rear|environment/i.test(c.label));
        setDeviceId(back?.deviceId ?? cams[cams.length - 1].deviceId);
      }
    });
  }, []);

  const { ref } = useZxing({
    deviceId,
    paused: !active,
    onDecodeResult(result) {
      const text = (result as any).getText();
      if (text === lastScanned.current) return;
      lastScanned.current = text;
      onResult(text);
      if (cooldown.current) clearTimeout(cooldown.current);
      cooldown.current = setTimeout(() => { lastScanned.current = ""; }, 2000);
    },
    onError(err) {
      if (err instanceof Error && err.message.includes("No MultiFormat")) return;
      onError?.(err instanceof Error ? err.message : String(err));
    },
  });

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video w-full max-h-48">
        <video ref={ref} className="w-full h-full object-cover" />
        {!active && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <CameraOff className="h-10 w-10 text-white/50" />
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-[20%] border-2 border-white/60 rounded-md" />
          <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[60%] h-0.5 bg-primary/80 animate-scan" />
        </div>
        <Button
          size="icon"
          variant="secondary"
          className="absolute top-2 left-2 h-8 w-8 opacity-80"
          onClick={() => setActive((v) => !v)}
        >
          {active ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
        </Button>
      </div>

      {devices.length > 1 && (
        <div className="flex items-center gap-2">
          <FlipHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={deviceId} onValueChange={setDeviceId}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="اختر الكاميرا" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((d, i) => (
                <SelectItem key={d.deviceId} value={d.deviceId}>
                  {d.label || `كاميرا ${i + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <p className="text-xs text-center text-muted-foreground">
        وجّه الكاميرا نحو الباركود — سيُضاف الدواء تلقائياً
      </p>
    </div>
  );
}
