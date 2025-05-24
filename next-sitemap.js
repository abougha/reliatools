/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.reliatools.com', // No trailing slash!
  generateRobotsTxt: true, // Generates robots.txt
  sitemapSize: 5000,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    additionalSitemaps: [
      'https://www.reliatools.com/sitemap.xml',
    ],
  },
};
