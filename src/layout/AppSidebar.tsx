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
    path: "/",
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
      { name: "Anos fundamentais", path: "/configuracoes/anos-academicos-fundamentais" },
      { name: "Categorias de nota", path: "/configuracoes/categorias-nota" },
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
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
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

  // Filtrar navItems baseado no tipo de usuário
  const filteredNavItems = useMemo(() => {
    if (!mounted) return navItems;

    /*
     * user?.academia?.nivel distingue o tipo de instituição: 'escola' | 'superior'
     * user?.academia?.type indica a natureza: 'public' | 'private'
     */
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
          const visiblePaths = new Set(
            user?.tipo === "academia"
              ? [
                  "/configuracoes/ano-letivo",
                  "/configuracoes/anos-academicos-fundamentais",
                  "/configuracoes/categorias-nota",
                  "/configuracoes/regras-avaliacao-final",
                  "/configuracoes/seguranca",
                ]
              : user?.tipo === "admin" && isFpp
                ? ["/configuracoes/ano-letivo", "/configuracoes/seguranca"]
                : ["/configuracoes/seguranca"],
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
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/">
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
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
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
  );
}
