// src/components/ui/table/ResponsiveTable.tsx
"use client";
import React, { useRef, useEffect, useState, ReactNode } from "react";

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

interface ResponsiveTableWrapperProps {
  children: ReactNode;
  className?: string;
  showScrollIndicator?: boolean;
}

/**
 * Wrapper responsivo para tabelas
 * Adiciona scroll horizontal com sombras indicadoras
 */
export function ResponsiveTableWrapper({ 
  children, 
  className = "",
  showScrollIndicator = true 
}: ResponsiveTableWrapperProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
    isScrolling: false,
  });

  const checkScroll = () => {
    if (!scrollRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    
    setScrollState({
      canScrollLeft: scrollLeft > 0,
      canScrollRight: scrollLeft < scrollWidth - clientWidth - 1,
      isScrolling: scrollWidth > clientWidth,
    });
  };

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener("resize", handleResize);
    
    return () => window.removeEventListener("resize", handleResize);
  }, [children]);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    scrollElement.addEventListener("scroll", checkScroll);
    return () => scrollElement.removeEventListener("scroll", checkScroll);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Sombra esquerda - indica que pode rolar para esquerda */}
      {showScrollIndicator && scrollState.canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-gray-900 to-transparent z-10 pointer-events-none" />
      )}
      
      {/* Sombra direita - indica que pode rolar para direita */}
      {showScrollIndicator && scrollState.canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent z-10 pointer-events-none" />
      )}

      {/* Container com scroll */}
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-visible"
        style={{
          WebkitOverflowScrolling: "touch", // Smooth scroll no iOS
        }}
      >
        {children}
      </div>

      {/* Indicador de scroll inferior (mobile) */}
      {showScrollIndicator && scrollState.isScrolling && (
        <div className="flex justify-center pt-2 pb-1 md:hidden">
          <div className="flex gap-1">
            <div className={`h-1 w-8 rounded-full transition-colors ${
              scrollState.canScrollLeft 
                ? "bg-blue-500" 
                : "bg-gray-300 dark:bg-gray-700"
            }`} />
            <div className={`h-1 w-8 rounded-full transition-colors ${
              scrollState.canScrollRight 
                ? "bg-blue-500" 
                : "bg-gray-300 dark:bg-gray-700"
            }`} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Componente Table responsivo
 * Garante que a tabela nunca quebre o layout
 */
export function ResponsiveTable({ children, className = "" }: ResponsiveTableProps) {
  return (
    <table 
      className={`w-full ${className}`}
      style={{
        minWidth: "max-content", // Garante que nunca encolha
        maxWidth: "100%", // Mas respeita limite do container
      }}
    >
      {children}
    </table>
  );
}

// Props dos subcomponentes
interface TableHeaderProps {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
}

interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

interface TableRowProps {
  children: ReactNode;
  className?: string;
}

interface TableCellProps {
  children: ReactNode;
  isHeader?: boolean;
  className?: string;
  colSpan?: number;
  align?: "left" | "center" | "right";
}

/**
 * Header da tabela com opção de sticky
 */
export function ResponsiveTableHeader({ 
  children, 
  className = "",
  sticky = false 
}: TableHeaderProps) {
  return (
    <thead 
      className={`${className} ${
        sticky ? "sticky top-0 z-20 bg-white dark:bg-gray-900" : ""
      }`}
    >
      {children}
    </thead>
  );
}

/**
 * Body da tabela
 */
export function ResponsiveTableBody({ children, className = "" }: TableBodyProps) {
  return <tbody className={className}>{children}</tbody>;
}

/**
 * Row da tabela
 */
export function ResponsiveTableRow({ children, className = "" }: TableRowProps) {
  return <tr className={className}>{children}</tr>;
}

/**
 * Cell da tabela
 */
export function ResponsiveTableCell({
  children,
  isHeader = false,
  className = "",
  colSpan = 1,
  align = "left",
}: TableCellProps) {
  const CellTag = isHeader ? "th" : "td";
  
  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[align];

  return (
    <CellTag 
      colSpan={colSpan} 
      className={`${alignClass} ${className}`}
    >
      {children}
    </CellTag>
  );
}

// Exportar tudo junto
export const ResponsiveTableComponents = {
  Wrapper: ResponsiveTableWrapper,
  Table: ResponsiveTable,
  Header: ResponsiveTableHeader,
  Body: ResponsiveTableBody,
  Row: ResponsiveTableRow,
  Cell: ResponsiveTableCell,
};