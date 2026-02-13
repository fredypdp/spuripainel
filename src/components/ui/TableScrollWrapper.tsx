import React, { ReactNode } from "react";

interface TableScrollWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper para tabelas com scroll horizontal melhorado
 * Funciona em todos os dispositivos e navegadores
 */
export const TableScrollWrapper: React.FC<TableScrollWrapperProps> = ({ 
  children, 
  className = "" 
}) => {
  return (
    <div className={`overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] ${className}`}>
      <div className="w-full overflow-x-auto overflow-y-visible scrollbar-custom" style={{
          WebkitOverflowScrolling: 'touch', // Melhora scroll em iOS
          scrollbarWidth: 'thin', // Firefox
          scrollbarColor: '#D0D5DD #F9FAFB', // Firefox: thumb track
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default TableScrollWrapper;