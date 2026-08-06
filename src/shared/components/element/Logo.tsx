import { cn } from '@/shared/utils/cn';
import daftariLogo from '@/assets/daftari2.png';

export default ({ className, size = 32 }: { className?: string; size?: number }) => (
    <div className={cn('flex items-center justify-center', className)}>
        <img
            src={daftariLogo}
            alt="Logo"
            style={{ width: size, height: size }}
            className="object-contain"
        />
    </div>
);
