import AccountPortal from "@/components/AccountPortal";

export default function AccountPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/90 border-b border-gray-800">
        <div className="px-8 py-4">
          <h1 className="text-2xl font-bold text-white">Account Portal</h1>
          <p className="text-gray-400 text-sm">Manage your profile and deployments</p>
        </div>
      </header>

      <main className="p-8">
        <div className="max-w-7xl mx-auto">
          <AccountPortal />
        </div>
      </main>
    </div>
  );
}
