// src/components/landing/LandingIcons.tsx
// Ícones lineares simples, desenhados à mão para esta página — mesmo espírito
// dos SVGs embutidos já usados em Alert.tsx / DropZone.tsx / ThemeToggleButton.tsx,
// em vez de depender de um pacote de ícones externo com nomes não verificados.

import React from "react";

type IconProps = { className?: string };
const base = "w-6 h-6";

export const GraduationCapIcon: React.FC<IconProps> = ({ className = base }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.6}>
    <path d="M2 8.5 12 4l10 4.5-10 4.5-10-4.5Z" strokeLinejoin="round" />
    <path d="M6 10.7v4.3c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6v-4.3" strokeLinejoin="round" />
    <path d="M21 9v5.5" strokeLinecap="round" />
  </svg>
);

export const SchoolBuildingIcon: React.FC<IconProps> = ({ className = base }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.6}>
    <path d="M4 21V9l8-5 8 5v12" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M9 21v-6h6v6" strokeLinejoin="round" />
    <path d="M4 21h16" strokeLinecap="round" />
    <path d="M9 12h.01M15 12h.01M12 9h.01" strokeLinecap="round" />
  </svg>
);

export const UniversityIcon: React.FC<IconProps> = ({ className = base }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.6}>
    <path d="M3 10 12 4l9 6" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M5 10v9M9 10v9M15 10v9M19 10v9" strokeLinecap="round" />
    <path d="M3 21h18" strokeLinecap="round" />
  </svg>
);

export const ShieldCheckIcon: React.FC<IconProps> = ({ className = base }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.6}>
    <path d="M12 3.5 5 6v6c0 4.2 3 7.4 7 8.5 4-1.1 7-4.3 7-8.5V6l-7-2.5Z" strokeLinejoin="round" />
    <path d="m9 12.5 2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BellIcon: React.FC<IconProps> = ({ className = base }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.6}>
    <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" strokeLinejoin="round" />
    <path d="M9.5 18a2.5 2.5 0 0 0 5 0" strokeLinecap="round" />
  </svg>
);

export const WalletIcon: React.FC<IconProps> = ({ className = base }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.6}>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h11A2.5 2.5 0 0 1 19 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 3 16.5v-9Z" strokeLinejoin="round" />
    <path d="M19 10.5h2v5h-2" strokeLinejoin="round" />
    <circle cx="17" cy="13" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const CoinsDownIcon: React.FC<IconProps> = ({ className = base }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.6}>
    <ellipse cx="9" cy="7" rx="6" ry="3" />
    <path d="M3 7v4c0 1.66 2.69 3 6 3s6-1.34 6-3V7" strokeLinecap="round" />
    <path d="M3 11v4c0 1.66 2.69 3 6 3 1.1 0 2.13-.16 3-.44" strokeLinecap="round" />
    <path d="M16 13l3 3m0 0 3-3m-3 3V9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LinkGlobeIcon: React.FC<IconProps> = ({ className = base }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.6}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.2 2.2 3.3 5 3.3 8.5s-1.1 6.3-3.3 8.5c-2.2-2.2-3.3-5-3.3-8.5S9.8 5.7 12 3.5Z" />
  </svg>
);

export const LockChainIcon: React.FC<IconProps> = ({ className = base }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.6}>
    <rect x="5" y="10.5" width="14" height="9" rx="2" />
    <path d="M8 10.5V7a4 4 0 1 1 8 0v3.5" strokeLinecap="round" />
    <circle cx="12" cy="14.7" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const RocketIcon: React.FC<IconProps> = ({ className = base }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.6}>
    <path d="M13.5 3.5c3 .3 5 2.3 5.3 5.3.3 3-2 6.7-5.3 8.2l-3-3c1.5-3.3 5.2-5.6 8.2-5.3" strokeLinejoin="round" />
    <path d="M10.5 14.5c-1.7 0-3.5.7-4.7 2.7 2-.2 3-.1 4 .3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m9.5 15.5-2-2c-2 1.2-2.7 3-2.7 4.7 1.7 0 3.5-.7 4.7-2.7Z" strokeLinejoin="round" />
    <circle cx="15" cy="9" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

export const ChevronDownSmallIcon: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 20 20" fill="none" className={className} stroke="currentColor" strokeWidth={1.8}>
    <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
