import { auth } from "@clerk/nextjs/server";
import { cacheLife } from "next/cache";
import { USDA_DATA_TYPES, USDA_PAGE_SIZE, cleanQuery, foodsFromSearch, portionsFrom, type UsdaFood } from "@/lib/usda";

// GET /api/foods/search?q=greek+yogurt → { foods: UsdaFood[] }
//
// The browser asks us, and we ask USDA FoodData Central. The call happens
// here, on the server, because the API key must stay secret (it never
// reaches the browser) and the free key allows 1,000 requests an hour, so
// results are cached for a day and shared by everyone who searches the same
// words. Only signed-in people can search, so the key can't be used by others.

async function searchUsda(query: string): Promise<UsdaFood[]> {
  "use cache";
  cacheLife("days");
  const key = process.env.USDA_API_KEY;
  if (!key) throw new Error("USDA_API_KEY is not set");
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", String(USDA_PAGE_SIZE * 2));
  url.searchParams.set("dataType", USDA_DATA_TYPES.join(","));
  // The key goes in a header rather than the URL, so it stays out of logs.
  const response = await fetch(url, { headers: { "X-Api-Key": key }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`USDA answered ${response.status}`);
  // Failures throw, so they're never cached: the next search tries again.
  const foods = foodsFromSearch(await response.json()).slice(0, USDA_PAGE_SIZE);
  return withPortions(foods, key);
}

// Search results don't include household portions ("1 cup = 245 g"); the
// food details do. One batch request covers all the results. If it fails,
// the foods are still returned, measured in grams only.
async function withPortions(foods: UsdaFood[], key: string): Promise<UsdaFood[]> {
  if (foods.length === 0) return foods;
  try {
    const response = await fetch("https://api.nal.usda.gov/fdc/v1/foods", {
      method: "POST",
      headers: { "X-Api-Key": key, "Content-Type": "application/json" },
      // Only energy is asked for, to keep the response small; portions always come.
      body: JSON.stringify({ fdcIds: foods.map((food) => food.fdcId), format: "full", nutrients: [208] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return foods;
    const details: unknown = await response.json();
    if (!Array.isArray(details)) return foods;
    const byId = new Map(details.map((item: { fdcId?: number }) => [item?.fdcId, portionsFrom(item)]));
    return foods.map((food) => {
      const portions = byId.get(food.fdcId);
      return portions?.length ? { ...food, portions } : food;
    });
  } catch {
    return foods;
  }
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Sign in to search USDA foods." }, { status: 401 });

  const query = cleanQuery(new URL(request.url).searchParams.get("q"));
  if (!query) return Response.json({ error: "Type 2 to 60 characters to search." }, { status: 400 });

  try {
    const foods = await searchUsda(query.toLowerCase());
    return Response.json({ foods }, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (error) {
    console.error("USDA search failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "USDA FoodData Central isn’t answering right now." }, { status: 502 });
  }
}
