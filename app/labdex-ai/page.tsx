import { Suspense } from "react";
import { ConversationSidebar } from "@/components/labdex-ai/ConversationSidebar";
import { ChatShell } from "@/components/labdex-ai/ChatShell";
import { Loading } from "@/components/ui/Loading";

export const metadata = {
  title: "LABDEX AI | LABDEX",
};

export default function LabdexAiPage() {
  return (
    <div className="flex h-[calc(100dvh-4rem)] w-full">
      <ConversationSidebar />
      <Suspense fallback={<Loading label="Cargando LABDEX AI…" />}>
        <ChatShell />
      </Suspense>
    </div>
  );
}
