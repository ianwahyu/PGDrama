import type { APIRoute } from "astro";
import { searchContent } from "../../lib/splay";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");

  if (!q) {
    return new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const results = await searchContent(q, 5); // Just 5 items for auto-suggest
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to search" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
