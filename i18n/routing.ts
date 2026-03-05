import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'fr', 'zh'],
  defaultLocale: 'en',
  localePrefix: 'never', // Use cookies instead of URL prefix
  localeDetection: true // Enable automatic locale detection from cookies/headers
});

export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
