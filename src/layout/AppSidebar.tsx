// src/layout/AppSidebar.tsx
"use client";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  ChevronDownIcon,
  HorizontaLDots,
} from "../icons/index";
import Icon from "@/components/ui/Icon";
import SidebarWidget from "./SidebarWidget";
import { getCookie } from '@/lib/utils/cookies';
import type { MeuPerfilResponse } from '@/types/api';

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <Icon width="24px" icon="flowbite:grid-outline" />,
    name: "Painel",
    path: "/painel",
  },
  {
    icon: <Icon width="24px" icon="ix:user-profile" />,
    name: "Perfil",
    path: "/perfil",
  },
  {
    name: "Registros",
    icon: <Icon width="24px" icon="vaadin:records" />,
    subItems: [
      { name: "Notas",  path: "/notas"  },
      { name: "Faltas", path: "/faltas" },
    ],
  },
  {
    name: "Avaliações",
    icon: <Icon width="24px" icon="mdi:clipboard-check-outline" />,
    subItems: [
      { name: "Avaliações Finais", path: "/avaliacoes/avaliacoes-finais" },
    ],
  },
  {
    name: "Gerenciamento",
    icon: <Icon width="24px" icon="eos-icons:cluster-management-outlined" />,
    subItems: [
      { name: "Cursos",               path: "/gerenciamento/cursos"               },
      { name: "Matérias Disciplinares", path: "/gerenciamento/materias-disciplinares" },
      { name: "Turmas",               path: "/gerenciamento/turmas"               },
    ],
  },
  {
    icon: <Icon width="24px" icon="fluent-emoji-high-contrast:school" />,
    name: "Academias",
    subItems: [
      { name: "Listar",    path: "/academias"           },
      { name: "Cadastrar", path: "/academias/cadastrar" },
    ],
  },
  {
    icon: <Icon width="24px" icon="mdi:account-school" />,
    name: "Estudantes",
    subItems: [
      { name: "Listar",    path: "/estudantes"           },
      { name: "Cadastrar", path: "/estudantes/cadastrar" },
      { name: "Solicitações", path: "/solicitacoes-matricula" },
    ],
  },
  {
    icon: <Icon width="24px" icon="mdi:cloud-outline" />,
    name: "Armazenamento",
    path: "/armazenamento",
  },
  {
    icon: <Icon width="24px" icon="mdi:cog-outline" />,
    name: "Configurações",
    subItems: [
      { name: "Ano Letivo", path: "/configuracoes/ano-letivo" },
      { name: "Anos acadêmicos", path: "/configuracoes/anos-academicos" },
      { name: "Regras de avaliação", path: "/configuracoes/regras-avaliacao-final" },
      { name: "Segurança", path: "/configuracoes/seguranca" },
    ],
  },
  {
    icon: <Icon width="24px" icon="mdi:flask-outline" />,
    name: "Testes",
    path: "/testes",
  },
];

export default function AppSidebar() {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, closeMobileSidebar } = useSidebar();
  const pathname = usePathname();
  const [user,    setUser]    = useState<MeuPerfilResponse | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Hydrates sidebar permissions from the user cookie on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const userCookie = getCookie("user");
    if (userCookie) {
      try {
        setUser(JSON.parse(userCookie));
      } catch (error) {}
    }
  }, []);

  useEffect(() => {
    // Fecha a sidebar mobile sempre que a rota mudar (clique em qualquer
    // item de navegação, inclusive subitens, ou navegação programática).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    closeMobileSidebar();
  }, [pathname]);

  // A partir daqui: posicionamento real (não estimado) da sidebar no mobile.
  // Em vez de supor que o header sempre mede 4rem, medimos a posição real
  // do header (#app-header) e o tamanho real da área visível através da
  // Visual Viewport API, que reflete o espaço restante depois de descontar
  // barras de navegador dinâmicas (topo/rodapé). Assim a sidebar sempre
  // começa logo abaixo do header e nunca invade a área coberta pelo
  // navegador, independente de aparelho, navegador ou altura real do header.
  const [isDesktop, setIsDesktop] = useState(false);
  const [mobileBounds, setMobileBounds] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const updateIsDesktop = () => setIsDesktop(desktopQuery.matches);

    updateIsDesktop();
    desktopQuery.addEventListener("change", updateIsDesktop);

    return () => {
      desktopQuery.removeEventListener("change", updateIsDesktop);
    };
  }, []);

  useEffect(() => {
    // No desktop a sidebar não é um overlay sobre o header; as classes
    // Tailwind (lg:) já cuidam do posicionamento e nenhuma medição é
    // necessária.
    if (isDesktop) {
      setMobileBounds(null);
      return;
    }

    const updateBounds = () => {
      const header = document.getElementById("app-header");
      // Fallback de 64px caso o header não seja encontrado por algum motivo.
      const top = header ? header.getBoundingClientRect().bottom : 64;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;

      setMobileBounds({ top, height: Math.max(viewportHeight - top, 0) });
    };

    updateBounds();

    window.visualViewport?.addEventListener("resize", updateBounds);
    window.visualViewport?.addEventListener("scroll", updateBounds);
    window.addEventListener("resize", updateBounds);
    window.addEventListener("orientationchange", updateBounds);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateBounds);
      window.visualViewport?.removeEventListener("scroll", updateBounds);
      window.removeEventListener("resize", updateBounds);
      window.removeEventListener("orientationchange", updateBounds);
    };
  }, [isDesktop]);

  // Filtrar navItems baseado no tipo de usuário
  const filteredNavItems = useMemo(() => {
    if (!mounted) return navItems;

    /*
     * user?.academia?.nivel distingue o tipo de instituição: 'escola' | 'superior'
     * user?.academia?.type indica a natureza: 'public' | 'private'
     */
    const isFundamentalOrMixed =
      user?.academia?.nivel === "escola" &&
      ["fundamental", "misto"].includes(user?.academia?.nivel_escolar ?? "");
    const isFundamental =
      user?.academia?.nivel === "escola" &&
      user?.academia?.nivel_escolar === "fundamental";

    const isAdmin = user?.tipo === "admin";
    const isFpp = isAdmin && user?.admin?.role === "fpp";

    return navItems
      .filter((item) => {
        if (user?.tipo) {
          // Academias: apenas admin
          if (item.name === "Academias") {
            return user.tipo === "admin";
          }
          // Estudantes: admin ou academia
          if (item.name === "Estudantes") {
            return user.tipo === "admin" || user.tipo === "academia";
          }
          // Gerenciamento: apenas academia
          if (item.name === "Gerenciamento") {
            return user.tipo === "academia";
          }
          // Configurações: admin FPP, academia ou estudante (segurança)
          if (item.name === "Configurações") {
            return isFpp || user.tipo === "academia" || user.tipo === "estudante";
          }
          // Armazenamento: apenas admin
          if (item.path === "/armazenamento") {
            return user.tipo === "admin";
          }
          // Testes: apenas academia
          if (item.path === "/testes") {
            return user.tipo === "academia";
          }
        }
        return true;
      })
      .map((item) => {
        // Para academias do ensino fundamental, remover "Cursos" do submenu
        if (item.name === "Gerenciamento" && item.subItems && isFundamental) {
          return {
            ...item,
            subItems: item.subItems.filter(
              (sub) => sub.path !== "/gerenciamento/cursos",
            ),
          };
        }

        // Academias: "Cadastrar" só para admin
        if (item.name === "Academias" && item.subItems) {
          return {
            ...item,
            subItems: item.subItems.filter(
              (sub) => sub.path !== "/academias/cadastrar" || isAdmin,
            ),
          };
        }

        // Configurações: mostrar apenas páginas aplicáveis ao tipo de usuário
        if (item.name === "Configurações" && item.subItems) {
          const academiaSettingsPaths = [
            "/configuracoes/ano-letivo",
            ...(isFundamentalOrMixed ? ["/configuracoes/anos-academicos"] : []),
            "/configuracoes/regras-avaliacao-final",
            "/configuracoes/seguranca",
          ];
          const visiblePaths = new Set(
            user?.tipo === "academia"
              ? academiaSettingsPaths
              : user?.tipo === "admin" && isFpp
                ? ["/configuracoes/ano-letivo", "/configuracoes/regras-avaliacao-final", "/configuracoes/seguranca"]
                : ["/configuracoes/regras-avaliacao-final", "/configuracoes/seguranca"],
          );
          return {
            ...item,
            subItems: item.subItems.filter((sub) => visiblePaths.has(sub.path)),
          };
        }

        // Estudantes: "Cadastrar" só para academia
        if (item.name === "Estudantes" && item.subItems) {
          return {
            ...item,
            subItems: item.subItems.filter(
              (sub) =>
                sub.path !== "/estudantes/cadastrar" || user?.tipo === "academia",
            ),
          };
        }

        return item;
      });
  }, [user, mounted]);

  // Derive which submenu should be open based on current pathname
  const derivedOpenSubmenu = useMemo(() => {
    let result: { type: "main" | "others"; index: number } | null = null;

    ["main", "others"].forEach((menuType) => {
      filteredNavItems.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (subItem.path === pathname || pathname.startsWith(`${subItem.path}/`)) {
              result = {
                type: menuType as "main" | "others",
                index,
              };
            }
          });
        }
      });
    });

    return result;
  }, [pathname, filteredNavItems]);

  const [manualToggle, setManualToggle] = useState<{
    type: "main" | "others";
    index: number;
    pathname: string;
  } | null>(null);

  const openSubmenu =
    (manualToggle?.pathname === pathname ? manualToggle : null) ?? derivedOpenSubmenu;

  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname || pathname.startsWith(`${path}/`), [pathname]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setManualToggle((prevManualToggle) => {
      if (
        prevManualToggle &&
        prevManualToggle.type === menuType &&
        prevManualToggle.index === index &&
        prevManualToggle.pathname === pathname
      ) {
        return null;
      }
      return { type: menuType, index, pathname };
    });
  };

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "others",
  ) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group  ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
              }`}
            >
              <span
                className={`${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType && openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {/*
        Barra de rolagem fina e discreta para o conteúdo interno do sidebar.
        Escopo local via styled-jsx (não requer alterar CSS global).
      */}
      <style jsx>{`
        .sidebar-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.4) transparent;
        }
        .sidebar-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.4);
          border-radius: 9999px;
        }
        .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.6);
        }
      `}</style>

      <aside
        className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-[calc(100dvh-4rem)] lg:h-[100dvh] overflow-hidden transition-[width,transform] duration-300 ease-in-out z-50 border-r border-gray-200 
          ${
            isExpanded || isMobileOpen
              ? "w-[290px]"
              : isHovered
              ? "w-[290px]"
              : "w-[90px]"
          }
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0`}
        style={
          mobileBounds
            ? { top: `${mobileBounds.top}px`, height: `${mobileBounds.height}px`, marginTop: 0 }
            : undefined
        }
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={`hidden lg:flex py-8 shrink-0 ${
            !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
        >
          <Link href="/painel">
            {isExpanded || isHovered || isMobileOpen ? (
              <>
                <Image
                  className="dark:hidden"
                  src="/images/logo/logo.svg"
                  alt="Logo"
                  width={154}
                  height={32}
                />
                <Image
                  className="hidden dark:block"
                  src="/images/logo/logo-dark.svg"
                  alt="Logo"
                  width={154}
                  height={32}
                />
              </>
            ) : (
              <Image
                src="/images/logo/logo-icon.svg"
                alt="Logo"
                width={32}
                height={32}
              />
            )}
          </Link>
        </div>
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto duration-300 ease-linear sidebar-scrollbar">
          <nav className="mb-6">
            <div className="flex flex-col gap-4">
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                    !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    "Menu"
                  ) : (
                    <HorizontaLDots />
                  )}
                </h2>
                {renderMenuItems(filteredNavItems, "main")}
              </div>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}
