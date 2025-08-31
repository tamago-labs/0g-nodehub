import ModelsPage from "@/components/ModelsPage";

export default function ModelsPageRoute() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/90 border-b border-gray-800">
        <div className="px-8 py-4">
          <h1 className="text-2xl font-bold text-white">AI Models</h1>
          <p className="text-gray-400 text-sm">Browse and deploy AI inference models</p>
        </div>
      </header>

      <main className="p-8">
        <div className="max-w-7xl mx-auto">
          <ModelsPage />
        </div>
      </main>
    </div>
  );
}
