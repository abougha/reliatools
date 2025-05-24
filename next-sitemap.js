/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.reliatools.com',
  generateRobotsTxt: true,
  sitemapSize: 7000,
  changefreq: 'weekly',
  priority: 0.7,
  exclude: ['/admin', '/api/*'],
};
