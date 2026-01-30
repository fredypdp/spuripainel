import React from "react";
import { Metadata } from "next";
import PageContent from "./PageContent";

export const metadata: Metadata = {
  title: "Gerenciamento",
};

export default function login() {
  return <PageContent />;
}
