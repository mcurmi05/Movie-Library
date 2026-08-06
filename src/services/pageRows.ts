// PostgREST caps a response at 1000 rows, so anything that fetches a whole
// library (or a whole list) has to page through. `build` returns a fresh query
// each time because a Supabase query builder can only be awaited once.
const PAGE = 1000;

export async function fetchAllPages(build) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}
