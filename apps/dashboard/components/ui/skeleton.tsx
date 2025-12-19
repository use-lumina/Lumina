import BaseSkeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  count?: number;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  borderRadius?: string | number;
}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn(className)}>
      <BaseSkeleton {...props} />
    </div>
  );
}

export { Skeleton };
