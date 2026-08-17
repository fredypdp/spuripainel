"use client"
import Link from 'next/link';
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Icon from '@/components/ui/Icon';
import { useUserCookie } from '@/hooks/useUserCookie';
import { useUserType } from '@/hooks/useRoutePermission';
import UnauthorizedAccess from '@/components/guards/UnauthorizedAccess';
import LancamentoFaltasForm from './LancamentoFaltasForm';
export default function PageContent(){ const { user, loading } = useUserCookie(); const { isAcademia } = useUserType(); if(loading)return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" /></div>; if(!user||!isAcademia)return <UnauthorizedAccess requiredTypes={['academia']} message="Esta página está disponível apenas para academias." />; return <div><PageBreadcrumb pageTitle="Lançar Faltas"/><div className="max-w-3xl"><div className="flex items-center gap-3 mb-6"><Link href="/faltas" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"><Icon icon="mdi:arrow-left" width={18}/> Voltar para faltas</Link></div><LancamentoFaltasForm/></div></div> }
