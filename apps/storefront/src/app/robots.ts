const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://earthrevibe.com";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account/", "/checkout", "/cart", "/auth/", "/api/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
