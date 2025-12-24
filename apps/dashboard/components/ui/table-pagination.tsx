'use client';

import React from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  maxPageButtons?: number;
}

export function TablePagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  maxPageButtons = 5,
}: TablePaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Don't render if only one page or no items
  if (totalPages <= 1) return null;

  const generatePageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const halfButtons = Math.floor(maxPageButtons / 2);

    if (totalPages <= maxPageButtons) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      let startPage = Math.max(2, currentPage - halfButtons);
      let endPage = Math.min(totalPages - 1, currentPage + halfButtons);

      // Adjust if at beginning
      if (currentPage <= halfButtons + 1) {
        endPage = maxPageButtons - 1;
      }

      // Adjust if at end
      if (currentPage >= totalPages - halfButtons) {
        startPage = totalPages - maxPageButtons + 2;
      }

      // Add ellipsis before if needed
      if (startPage > 2) {
        pages.push('ellipsis');
      }

      // Add page numbers
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // Add ellipsis after if needed
      if (endPage < totalPages - 1) {
        pages.push('ellipsis');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = generatePageNumbers();

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            aria-disabled={currentPage === 1}
            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>

        {pageNumbers.map((pageNum, idx) => (
          <PaginationItem key={`page-${idx}`}>
            {pageNum === 'ellipsis' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                onClick={() => onPageChange(pageNum)}
                isActive={currentPage === pageNum}
                className="cursor-pointer"
              >
                {pageNum}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            aria-disabled={currentPage === totalPages}
            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
