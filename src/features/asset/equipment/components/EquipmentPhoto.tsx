import { useState } from 'react';
import { Car, Construction, Container, Cylinder, Droplets, Factory, Tractor, Truck, Wind, Wrench, Zap, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EquipmentCategory } from '../types';

const ICONS: Record<EquipmentCategory, LucideIcon> = {
  EXCAVATOR: Construction,
  BACKHOE_LOADER: Construction,
  TIPPER: Truck,
  TRUCK: Truck,
  TRANSIT_MIXER: Container,
  ROLLER: Cylinder,
  TRACTOR: Tractor,
  WATER_PUMP: Droplets,
  DG_SET: Zap,
  CAR: Car,
  OTHER: Wrench,
  LOADER: Construction,
  DOZER: Construction,
  GRADER: Construction,
  CRANE: Construction,
  CONCRETE_PUMP: Droplets,
  BATCHING_PLANT: Factory,
  COMPRESSOR: Wind,
  WATER_TANKER: Truck,
};

export function CategoryIcon({ category, className }: { category: EquipmentCategory; className?: string }) {
  const Icon = ICONS[category] ?? Wrench;
  return <Icon className={className} aria-hidden />;
}

/** The machine photo, or a category icon when there is none (or it fails to load). */
export function EquipmentPhoto({ src, category, name, className }: { src: string | null; category: EquipmentCategory; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn('grid shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted text-muted-foreground', className)}>
      {src && !failed ? (
        <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <CategoryIcon category={category} className="size-1/2" />
      )}
    </div>
  );
}

export default EquipmentPhoto;
