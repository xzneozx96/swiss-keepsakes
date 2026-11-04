/** The title and the one inviting line under it, the same for every block of the home (home-design.md §1). */
export function SectionHeading({ id, title, body }: { id: string, title: string, body: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="font-serif text-[22px] leading-7 font-medium text-balance" id={id}>{title}</h2>
      <p className="text-sm text-pretty text-muted">{body}</p>
    </div>
  )
}
