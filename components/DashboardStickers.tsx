import type { CSSProperties } from "react";

// Market-stand stickers in the Dashboard's margins, like the welcome screen's:
// one fact per food, per serving, from the built-in USDA list (lib/foods-data.ts).
// Each is the food's own color (red strawberries, an orange sweet potato), so
// they don't read as the grid's under / in range / over colors. Two in each
// margin, unevenly spaced. Wide screens only, and decorative (aria-hidden).
const STICKERS = [
  { food: "Strawberries", amount: "89 mg", nutrient: "vitamin C", tone: "bg-tomato text-white", ring: "var(--color-paper)", ground: "var(--color-tomato)", tilt: "6deg", place: "left-full ml-3 top-8" },
  { food: "Banana", amount: "422 mg", nutrient: "potassium", tone: "bg-lemon text-soil", ring: "var(--color-soil)", ground: "var(--color-lemon)", tilt: "-7deg", place: "right-full mr-1 top-44" },
  { food: "½ avocado", amount: "7 g", nutrient: "fiber", tone: "bg-leaf text-white", ring: "var(--color-paper)", ground: "var(--color-leaf)", tilt: "-4deg", place: "left-full ml-5 top-[21rem]" },
  { food: "Sweet potato", amount: "1,096 mcg", nutrient: "vitamin A", tone: "bg-carrot text-soil", ring: "var(--color-soil)", ground: "var(--color-carrot)", tilt: "8deg", place: "right-full mr-0.5 top-[34rem]" },
];

export function DashboardStickers() {
  return (
    <div aria-hidden="true" className="pointer-events-none hidden xl:block">
      {STICKERS.map((sticker, index) => (
        <div
          key={sticker.food}
          className={`sticker-in absolute flex h-24 w-32 flex-col items-center justify-center rounded-[50%] ${sticker.tone} ${sticker.place}`}
          style={
            {
              boxShadow: `inset 0 0 0 3.5px ${sticker.ground}, inset 0 0 0 5px ${sticker.ring}`,
              "--tilt": sticker.tilt,
              animationDelay: `${300 + index * 130}ms`,
            } as CSSProperties
          }
        >
          <span className="px-3 text-center text-[10px] font-bold uppercase leading-tight tracking-[0.08em]">{sticker.food}</span>
          <span className="font-display text-[21px] font-extrabold leading-tight">{sticker.amount}</span>
          <span className="text-[11px]">{sticker.nutrient}</span>
        </div>
      ))}
    </div>
  );
}
