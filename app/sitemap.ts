import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://certisen.com';
  const locales = ['en', 'fr', 'zh'];
  
  // Generate sitemap entries for all locales
  const routes = locales.map((locale) => ({
    url: locale === 'en' ? baseUrl : `${baseUrl}/${locale}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 1,
    alternates: {
      languages: {
        en: baseUrl,
        fr: `${baseUrl}/fr`,
        zh: `${baseUrl}/zh`,
      },
    },
  }));

  return routes;
}
