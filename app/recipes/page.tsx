import type { Metadata } from "next";
import { RequireProfile } from "@/components/Gates";
import { RecipesScreen } from "@/components/Recipes";

export const metadata: Metadata = { title: "Recipes" };

export default function RecipesPage() {
  return (
    <>
      <RequireProfile />
      <RecipesScreen />
    </>
  );
}
