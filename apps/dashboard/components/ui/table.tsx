'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Trace } from '@/app/page';

/* ----------------------------- Table Shell ----------------------------- */

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto rounded-lg border border-neutral-200/60 dark:border-neutral-800"
    >
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  );
}

/* ----------------------------- Header ----------------------------- */

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        'sticky top-0 z-10 bg-background backdrop-blur',
        '[&_tr]:border-b [&_tr]:border-neutral-200/60 dark:[&_tr]:border-neutral-800',
        className
      )}
      {...props}
    />
  );
}

/* ----------------------------- Body ----------------------------- */

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
}

/* ----------------------------- Footer ----------------------------- */

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('bg-neutral-100/50 border-t font-medium dark:bg-neutral-800/50', className)}
      {...props}
    />
  );
}

/* ----------------------------- Row ----------------------------- */

type RowVariant = 'success' | 'warning' | 'error';

function TableRow({
  className,
  ...props
}: React.ComponentProps<'tr'> & {
  'data-variant'?: RowVariant;
}) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'group cursor-pointer border-b border-neutral-200/60 transition-all',
        'hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40',
        'data-[variant=success]:border-l-2 data-[variant=success]:border-l-emerald-400',
        'data-[variant=warning]:border-l-2 data-[variant=warning]:border-l-amber-400',
        'data-[variant=error]:border-l-2 data-[variant=error]:border-l-red-500',
        className
      )}
      {...props}
    />
  );
}

/* ----------------------------- Head Cell ----------------------------- */

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-10 px-2 text-left align-middle',
        'text-xs font-semibold uppercase tracking-wide text-neutral-500',
        'whitespace-nowrap dark:text-neutral-400',
        '[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      {...props}
    />
  );
}

/* ----------------------------- Body Cell ----------------------------- */

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'p-2 align-middle whitespace-nowrap text-sm text-neutral-800',
        'dark:text-neutral-200',
        className
      )}
      {...props}
    />
  );
}

/* ----------------------------- Caption ----------------------------- */

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 text-sm text-neutral-500 dark:text-neutral-400', className)}
      {...props}
    />
  );
}

/* ----------------------------- Status Dot ----------------------------- */

function StatusDot({ status }: { status: Trace['status'] }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className={cn(
          'h-2.5 w-2.5 rounded-full',
          status === 'healthy' && 'bg-emerald-500',
          status === 'degraded' && 'bg-amber-500',
          status === 'error' && 'bg-red-500'
        )}
      />
      <span className="hidden text-xs capitalize text-neutral-500 md:inline">{status}</span>
    </span>
  );
}

/* ----------------------------- Exports ----------------------------- */

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  StatusDot,
};
