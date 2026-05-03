"use client";

import { useState } from "react";

import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectSidebar } from "@/components/editor/project-sidebar";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-background">
      <EditorNavbar
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen((open) => !open)}
      />
      <ProjectSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="min-h-screen pt-14">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Gosty AI</h1>
          <p className="text-sm text-muted-foreground">Editor canvas placeholder.</p>
        </div>
      </main>
    </div>
  );
}
