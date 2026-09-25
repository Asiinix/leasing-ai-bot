"use client";

import Image from "next/image";
import { CarFront } from "lucide-react";
import { useState } from "react";
import { appPath } from "@/lib/app-path";
import type { VehicleCatalogItem } from "./types";
import { vehiclePhoto } from "./photos";

export function VehicleImage({
  vehicle,
  compact = false,
}: {
  vehicle: VehicleCatalogItem;
  compact?: boolean;
}) {
  const photo = vehiclePhoto(vehicle);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const available = photo && failedSource !== photo.src;
  return (
    <figure className={`vehicle-media${compact ? " vehicle-media-compact" : ""}`}>
      {available ? (
        <Image
          src={appPath(photo.src as `/${string}`)}
          alt={photo.alt}
          width={640}
          height={400}
          unoptimized
          onError={() => setFailedSource(photo.src)}
        />
      ) : (
        <div
          className="vehicle-media-placeholder"
          role="img"
          aria-label={`${vehicle.brand}: фото пока не добавлено`}
        >
          <CarFront size={64} strokeWidth={1.2} />
          <span>{vehicle.brand}</span>
        </div>
      )}
    </figure>
  );
}
