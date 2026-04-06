"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import {
  jobApiService,
  subscribeToJobStream,
  tokenStorage,
  type JobStreamEvent,
} from "@/lib/api";

type UiNotification = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  tone: "info" | "success" | "error";
};

const MAX_NOTIFICATIONS = 30;

const toneClasses: Record<UiNotification["tone"], string> = {
  info: "bg-blue-500",
  success: "bg-green-500",
  error: "bg-red-500",
};

function normalizeEvent(event: JobStreamEvent): UiNotification {
  const pct = Math.max(0, Math.min(100, Math.round(event.progress ?? 0)));
  const total = event.total_items ?? 0;
  const done = event.done_items ?? 0;
  const fail = event.fail_items ?? 0;

  switch (event.type) {
    case "job_enqueued":
      return {
        id: `${event.job_id}-${Date.now()}-enqueued`,
        title: "Job enfileirado",
        description: `Job ${event.job_id} criado com ${total || "N"} item(ns).`,
        createdAt: new Date().toISOString(),
        tone: "info",
      };
    case "job_progress":
      return {
        id: `${event.job_id}-${Date.now()}-progress`,
        title: "Processamento em andamento",
        description: `${pct}% concluído (${done} sucesso, ${fail} falha).`,
        createdAt: new Date().toISOString(),
        tone: "info",
      };
    case "job_done":
      return {
        id: `${event.job_id}-${Date.now()}-done`,
        title: "Job concluído",
        description: `Concluído com ${done} sucesso e ${fail} falha.`,
        createdAt: new Date().toISOString(),
        tone: fail > 0 ? "error" : "success",
      };
    case "job_failed":
    default:
      return {
        id: `${event.job_id}-${Date.now()}-failed`,
        title: "Job falhou",
        description:
          event.error ||
          event.message ||
          `Falha no job ${event.job_id}${fail > 0 ? ` (${fail} item(ns) com erro)` : ""}.`,
        createdAt: new Date().toISOString(),
        tone: "error",
      };
  }
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<UiNotification[]>([]);
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) return;

    const controller = new AbortController();

    const start = async () => {
      try {
        const recentJobs = await jobApiService.list(token);
        const initial: UiNotification[] = (recentJobs.jobs || []).slice(0, 6).map((job) => ({
          id: `${job.id}-${job.status}`,
          title:
            job.status === "done"
              ? "Job finalizado"
              : job.status === "failed"
                ? "Job com erro"
                : "Job em andamento",
          description:
            job.error ||
            `${job.progress}% (${job.done_items} sucesso, ${job.fail_items} falha).`,
          createdAt: job.completed_at || job.started_at || job.created_at,
          tone:
            job.status === "failed"
              ? "error"
              : job.status === "done" && job.fail_items === 0
                ? "success"
                : "info",
        }));
        setNotifications(initial);
      } catch {
        // Sem bloquear dropdown quando listagem falha
      }

      try {
        await subscribeToJobStream({
          token,
          signal: controller.signal,
          onEvent: (event) => {
            setNotifications((prev) => {
              const next = [normalizeEvent(event), ...prev];
              return next.slice(0, MAX_NOTIFICATIONS);
            });
            setNotifying(true);
          },
        });
      } catch {
        // Stream pode encerrar; estado do sino continua com histórico carregado.
      }
    };

    start();
    return () => controller.abort();
  }, []);

  const ordered = useMemo(
    () =>
      [...notifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [notifications]
  );

  function toggleDropdown() {
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleClick = () => {
    toggleDropdown();
    setNotifying(false);
  };

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleClick}
      >
        <span
          className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${
            !notifying ? "hidden" : "flex"
          }`}
        >
          <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
        </span>
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notificações
          </h5>
          <button
            onClick={toggleDropdown}
            className="text-gray-500 transition dropdown-toggle dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {ordered.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Sem notificações de jobs no momento.
            </li>
          )}

          {ordered.map((n) => (
            <li key={n.id}>
              <DropdownItem
                onItemClick={closeDropdown}
                className="flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
              >
                <span className="relative mt-0.5 flex h-2.5 w-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${toneClasses[n.tone]}`} />
                </span>

                <span className="block min-w-0">
                  <span className="mb-1 block text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                    {n.title}
                  </span>
                  <span className="block text-theme-sm text-gray-500 dark:text-gray-400 break-words">
                    {n.description}
                  </span>
                  <span className="mt-1 block text-xs text-gray-400 dark:text-gray-500">
                    {new Date(n.createdAt).toLocaleString("pt-PT")}
                  </span>
                </span>
              </DropdownItem>
            </li>
          ))}
        </ul>
      </Dropdown>
    </div>
  );
}
