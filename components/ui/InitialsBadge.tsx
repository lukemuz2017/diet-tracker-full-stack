// The person's badge: their initials on lemon with a soil ring, like the logo
// (design.md), or the photo they gave Clerk. Decorative: the name is always
// written next to it or in the button's label.
export function InitialsBadge({
  initials,
  photo,
  size = "small",
}: {
  initials: string;
  photo?: string | null;
  size?: "small" | "large";
}) {
  const box = size === "large" ? "size-12 text-lg" : "size-8 text-[13px]";
  if (photo) {
    // A tiny remote avatar, so a plain <img> rather than next/image.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" className={`${box} rounded-full object-cover`} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`${box} grid flex-none place-items-center rounded-full bg-lemon font-display font-extrabold tracking-wide text-soil shadow-[inset_0_0_0_2px_var(--color-lemon),inset_0_0_0_3.5px_var(--color-soil)]`}
    >
      {initials}
    </span>
  );
}
