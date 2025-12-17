import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 [&>svg]:size-3 [&>svg]:pointer-events-none transition-[color,box-shadow] focus-visible:ring-[3px] overflow-hidden',
  {
    variants: {
      variant: {
        // Default (primary accent)
        default:
          'border-transparent bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900',

        // Neutral pill (models, metadata)
        secondary:
          'border-transparent bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50',

        // Outline (Claude, low emphasis)
        outline: 'border-neutral-200 text-neutral-900 dark:border-neutral-700 dark:text-neutral-50',

        // HIGH severity / errors
        destructive: 'border-transparent bg-red-500 text-white dark:bg-red-900',

        // MEDIUM severity / warnings
        warning:
          'border-transparent bg-amber-500/20 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400',

        // Healthy / success
        success:
          'border-transparent bg-emerald-500/20 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400',

        // Low emphasis / inactive
        muted:
          'border-transparent bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
