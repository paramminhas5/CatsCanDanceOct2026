export default function Loading() {
  return (
    <main className="wrap grid gap-6 py-12" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-2/3 max-w-md rounded-xl bg-bone" />
      <div className="h-5 w-1/2 max-w-sm rounded-xl bg-bone" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[4/5] rounded-[16px] bg-bone" />)}
      </div>
    </main>
  );
}
