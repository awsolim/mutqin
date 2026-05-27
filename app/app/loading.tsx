export default function AppLoading() {
  return (
    <div className="space-y-4">
      <div className="h-20 animate-pulse rounded-2xl border border-line bg-paper" />
      <div className="h-40 animate-pulse rounded-2xl border border-line bg-paper" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-32 animate-pulse rounded-2xl border border-line bg-paper" />
        <div className="h-32 animate-pulse rounded-2xl border border-line bg-paper" />
      </div>
    </div>
  );
}
