export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold text-deep-earth mb-4">
        Earth Revibe
      </h1>
      <p className="text-xl text-dark-gray max-w-md text-center">
        Sustainable clothing for a conscious world. Coming soon.
      </p>
      <div className="mt-8 flex gap-4">
        <span className="inline-block px-4 py-2 bg-forest-green text-white rounded-md text-sm font-medium">
          Storefront
        </span>
        <span className="inline-block px-4 py-2 bg-sage/20 text-forest-green rounded-md text-sm font-medium">
          Port 3000
        </span>
      </div>
    </main>
  );
}
