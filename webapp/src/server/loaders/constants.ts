export const CACHE_REVALIDATE_SECONDS =
  process.env.VERCEL_ENV === "production" ? 3600 : 10;
