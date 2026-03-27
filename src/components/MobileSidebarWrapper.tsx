"use client";
import { useState } from "react";

interface Props {
  children: (ctx: {
    mobileSidebarOpen: boolean;
    setMobileSidebarOpen: (v: boolean) => void;
  }) => React.ReactNode;
}

export default function MobileSidebarWrapper({ children }: Props) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  return <>{children({ mobileSidebarOpen, setMobileSidebarOpen })}</>;
}
