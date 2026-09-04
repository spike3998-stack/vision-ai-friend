import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const App = lazy(() => import("@/app/App"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Guarda Municipal de Arraial do Cabo | Sistema Operacional" },
      {
        name: "description",
        content:
          "Sistema da Guarda Municipal de Arraial do Cabo: cadastro de agentes, postos de serviço, viaturas, checklist de vistoria e localização do motorista.",
      },
      { property: "og:title", content: "Guarda Municipal de Arraial do Cabo" },
      {
        property: "og:description",
        content:
          "Controle de postos de serviço, viaturas e checklists da Guarda Municipal de Arraial do Cabo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Carregando() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-200">
      Carregando sistema...
    </div>
  );
}

function Index() {
  return (
    <ClientOnly fallback={<Carregando />}>
      <Suspense fallback={<Carregando />}>
        <App />
      </Suspense>
    </ClientOnly>
  );
}
