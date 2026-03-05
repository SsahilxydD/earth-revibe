export default function AdminHomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="bg-white border border-light-gray rounded-xl p-12 text-center max-w-md">
        <h1 className="text-3xl font-semibold text-deep-earth mb-2">
          Earth Revibe
        </h1>
        <p className="text-lg text-medium-gray mb-6">Admin Dashboard</p>
        <div className="flex gap-3 justify-center">
          <span className="inline-block px-4 py-2 bg-deep-earth text-white rounded-md text-sm font-medium">
            Admin Panel
          </span>
          <span className="inline-block px-4 py-2 bg-off-white text-dark-gray rounded-md text-sm font-medium border border-light-gray">
            Port 3001
          </span>
        </div>
      </div>
    </main>
  );
}
