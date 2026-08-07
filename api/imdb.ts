// Vercel serverless function: IMDb rating breakdown and user reviews for one
// title, read live from IMDb's GraphQL endpoint.
//
//   ?action=histogram&imdbId=tt0111161
//     -> { histogram: [{ rating, votes }], total, average }
//   ?action=reviews&imdbId=tt0111161&first=5&after=<cursor>&sort=votes&rating=10
//     -> { reviews: [...], cursor, hasMore, total }
//
// Nothing is cached in our database: reviews change constantly and the
// breakdown is cheap enough to fetch on demand.

const GQL = "https://caching.graphql.imdb.com/";

async function gql(query, variables) {
  const res = await fetch(GQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-imdb-client-name": "imdb-web-next",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`IMDb responded ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

const HISTOGRAM_QUERY = `
  query Histogram($id: ID!) {
    title(id: $id) {
      ratingsSummary { aggregateRating voteCount }
      aggregateRatingsBreakdown {
        histogram { histogramValues { rating voteCount } }
      }
    }
  }
`;

// IMDb has no "sort by up-votes" - TOTAL_VOTES (up + down) is the closest it
// offers, and HELPFULNESS_SCORE is the ratio its own site defaults to.
const SORTS = {
  helpful: { by: "HELPFULNESS_SCORE", order: "DESC" },
  votes: { by: "TOTAL_VOTES", order: "DESC" },
  newest: { by: "SUBMISSION_DATE", order: "DESC" },
};

const REVIEWS_QUERY = `
  query Reviews(
    $id: ID!
    $first: Int!
    $after: ID
    $sort: ReviewsSort
    $filter: ReviewsFilter
  ) {
    title(id: $id) {
      reviews(first: $first, after: $after, sort: $sort, filter: $filter) {
        total
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            summary { originalText }
            text { originalText { plainText } }
            authorRating
            submissionDate
            spoiler
            author { userId nickName }
            helpfulness { upVotes }
          }
        }
      }
    }
  }
`;

async function histogram(imdbId) {
  const data = await gql(HISTOGRAM_QUERY, { id: imdbId });
  const title = data?.title;
  const values = title?.aggregateRatingsBreakdown?.histogram?.histogramValues;
  if (!values?.length) return null;
  return {
    // Ascending 1..10 so the chart can render straight from the array.
    histogram: values
      .map((v) => ({ rating: v.rating, votes: v.voteCount || 0 }))
      .sort((a, b) => a.rating - b.rating),
    total: title.ratingsSummary?.voteCount ?? null,
    average: title.ratingsSummary?.aggregateRating ?? null,
  };
}

async function reviews(imdbId, { first, after, sort, rating }) {
  const data = await gql(REVIEWS_QUERY, {
    id: imdbId,
    first,
    after,
    sort: SORTS[sort] || SORTS.helpful,
    filter: rating ? { authorRating: rating } : undefined,
  });
  const conn = data?.title?.reviews;
  if (!conn) return null;
  return {
    reviews: (conn.edges || []).map(({ node }) => ({
      id: node.id,
      url: `https://www.imdb.com/review/${node.id}/`,
      author: node.author?.nickName || "IMDb user",
      authorUrl: node.author?.userId
        ? `https://www.imdb.com/user/${node.author.userId}/`
        : null,
      title: node.summary?.originalText || null,
      text: node.text?.originalText?.plainText || "",
      rating: node.authorRating ?? null,
      date: node.submissionDate || null,
      likes: node.helpfulness?.upVotes ?? null,
      spoiler: !!node.spoiler,
    })),
    cursor: conn.pageInfo?.endCursor || null,
    hasMore: !!conn.pageInfo?.hasNextPage,
    total: conn.total ?? null,
  };
}

export default async function handler(req, res) {
  const q =
    req.query || Object.fromEntries(new URL(req.url, "http://x").searchParams);
  const imdbId = String(q.imdbId || "").trim();
  if (!/^tt\d+$/.test(imdbId)) {
    return res.status(400).json({ error: "Missing or invalid imdbId" });
  }

  try {
    if (q.action === "histogram") {
      const out = await histogram(imdbId);
      if (!out) return res.status(404).json({ error: "No ratings found" });
      // The breakdown barely moves hour to hour, so let the CDN hold it.
      res.setHeader("Cache-Control", "public, s-maxage=3600");
      return res.status(200).json(out);
    }

    if (q.action === "reviews") {
      const ratingFilter = Number(q.rating);
      const out = await reviews(imdbId, {
        first: Math.min(Math.max(Number(q.first) || 5, 1), 25),
        after: q.after ? String(q.after) : undefined,
        sort: String(q.sort || "helpful"),
        rating:
          ratingFilter >= 1 && ratingFilter <= 10
            ? Math.round(ratingFilter)
            : null,
      });
      if (!out) return res.status(404).json({ error: "No reviews found" });
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json(out);
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
