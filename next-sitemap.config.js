/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.reliatools.com', // No trailing slash!
  generateRobotsTxt: true, // Generates robots.txt
  sitemapSize: 5000,
  exclude: ['/app', '/app/*'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
  },
};
