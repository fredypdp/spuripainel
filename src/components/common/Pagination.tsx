// src/components/common/Pagination.tsx

import Button from "@/components/ui/button/Button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  loading = false,
}: PaginationProps) {
  // Handlers
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    onPageChange(page);
  };

  // Gerar números de páginas para exibir
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Calcular range de itens sendo exibidos
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-white/[0.05]">
      {/* Info de itens exibidos */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Mostrando <span className="font-medium">{startItem}</span> a{" "}
        <span className="font-medium">{endItem}</span> de{" "}
        <span className="font-medium">{totalItems}</span> resultados
      </div>

      {/* Controles de paginação */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handlePreviousPage}
          disabled={currentPage === 1 || loading}
        >
          Anterior
        </Button>
        
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            page === '...' ? (
              <span 
                key={`ellipsis-${index}`} 
                className="px-3 py-1 text-gray-500 dark:text-gray-400"
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => handlePageClick(page as number)}
                disabled={loading}
                className={`
                  px-3 py-1 rounded-md text-sm font-medium transition-colors min-w-[36px]
                  ${currentPage === page 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05]'
                  }
                  ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {page}
              </button>
            )
          ))}
        </div>
        
        <Button
          size="sm"
          variant="outline"
          onClick={handleNextPage}
          disabled={currentPage === totalPages || loading}
        >
          Próximo
        </Button>
      </div>
      
      {/* Info de página atual */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Página <span className="font-medium">{currentPage}</span> de{" "}
        <span className="font-medium">{totalPages}</span>
      </div>
    </div>
  );
}