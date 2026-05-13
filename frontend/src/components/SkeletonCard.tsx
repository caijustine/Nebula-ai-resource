export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 animate-pulse">
      <div className="h-4 bg-white/10 rounded-lg w-3/4 mb-3" />
      <div className="h-3 bg-white/[0.07] rounded w-full mb-2" />
      <div className="h-3 bg-white/[0.07] rounded w-2/3 mb-5" />
      <div className="flex gap-2">
        <div className="h-5 bg-white/10 rounded-full w-16" />
        <div className="h-5 bg-white/10 rounded-full w-12" />
      </div>
      <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
        <div className="h-3 bg-white/[0.07] rounded w-24" />
        <div className="h-6 bg-white/10 rounded-lg w-14" />
      </div>
    </div>
  )
}
