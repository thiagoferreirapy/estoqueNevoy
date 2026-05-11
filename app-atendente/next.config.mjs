import nextPWA from "next-pwa";

const withPWA = nextPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // App shell + assets ficam em cache; chamadas Supabase (auth/rest/realtime)
  // são sempre online — uma reserva offline não tem como ser arbitrada.
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
    {
      // Imagens do bucket Supabase (produto) — cache agressivo
      urlPattern: /\/storage\/v1\/object\/public\/product-images\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "supabase-product-images",
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
      },
    },
    {
      // Next assets
      urlPattern: /\/_next\/static\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "next-static",
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      // Mesmo origem (app shell)
      urlPattern: ({ url, sameOrigin }) =>
        sameOrigin && !url.pathname.startsWith("/_next/data"),
      handler: "NetworkFirst",
      options: {
        cacheName: "app-shell",
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
