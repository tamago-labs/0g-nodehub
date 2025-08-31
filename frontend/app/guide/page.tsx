export default function GuidePage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/90 border-b border-gray-800">
        <div className="px-8 py-4">
          <h1 className="text-2xl font-bold text-white">Guide</h1>
          <p className="text-gray-400 text-sm">Learn how to use 0G NodeHub effectively</p>
        </div>
      </header>

      <main className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">User Guide</h2>
            <p className="text-gray-300">Documentation and tutorials coming soon...</p>
          </div>
        </div>
      </main>
    </div>
  );
}
