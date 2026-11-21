/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.reliatools.com', // No trailing slash!
  // Match next.config.ts `trailingSlash: true`: every <loc> is the canonical
  // slashed URL, not one that 301s.
  trailingSlash: true,
  generateRobotsTxt: true, // Generates robots.txt
  sitemapSize: 5000,
  outDir: 'out',
  exclude: ['/app', '/app/*'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/app', '/app/*'],
      },
    ],
  },
};
