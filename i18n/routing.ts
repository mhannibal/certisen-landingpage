import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'fr', 'zh'],
  defaultLocale: 'en',
  localePrefix: 'as-needed' // Don't show /en in URLs for default locale
});

export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
