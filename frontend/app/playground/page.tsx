import Playground from "@/components/Playground";

export default function PlaygroundPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/90 border-b border-gray-800">
        <div className="px-8 py-4">
          <h1 className="text-2xl font-bold text-white">Playground</h1>
          <p className="text-gray-400 text-sm">Test and experiment with AI models</p>
        </div>
      </header>

      <main className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl overflow-hidden">
            <Playground />
          </div>
        </div>
      </main>
    </div>
  );
}
