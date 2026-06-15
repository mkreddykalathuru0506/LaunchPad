"use client";
import { useState } from "react";
import { Crosshair, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Two coordinate inputs + a "Use my location" button that fills them from the
 * device GPS (navigator.geolocation). Field agents tap this on site so the
 * visit / photo is geo-stamped where they actually stood. Names default to
 * latitude/longitude so the inputs post straight into the server action.
 */
export function GeoCapture({
  latName = "latitude",
  lngName = "longitude",
  defaultLat = "",
  defaultLng = "",
}: {
  latName?: string;
  lngName?: string;
  defaultLat?: string;
  defaultLng?: string;
}) {
  const [lat, setLat] = useState(defaultLat);
  const [lng, setLng] = useState(defaultLng);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function capture() {
    setErr(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErr("Geolocation is not available in this browser.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setBusy(false);
      },
      (e) => {
        setErr(e.message || "Could not read location.");
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          name={latName}
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          placeholder="Latitude"
          inputMode="decimal"
          className="flex h-9 w-full rounded-lg border border-input bg-card px-3 font-mono text-xs shadow-sm focus-ring"
        />
        <input
          name={lngName}
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          placeholder="Longitude"
          inputMode="decimal"
          className="flex h-9 w-full rounded-lg border border-input bg-card px-3 font-mono text-xs shadow-sm focus-ring"
        />
        <Button type="button" variant="outline" size="sm" onClick={capture} disabled={busy} className="shrink-0">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
          GPS
        </Button>
      </div>
      {err && <p className="text-[11px] text-destructive">{err}</p>}
    </div>
  );
}
