import "server-only";
import { unstable_cache } from "next/cache";
import { getCategories } from "./data";

export const getCachedCategories = unstable_cache(
  getCategories,
  ["public-categories"],
  { revalidate: 300, tags: ["public-categories"] },
);
