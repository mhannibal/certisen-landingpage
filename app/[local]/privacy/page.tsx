import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ local: string }> }): Promise<Metadata> {
  const { local } = await params;
  const t = await getTranslations('privacyPolicy');

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default function PrivacyPolicy() {
  const t = useTranslations('privacyPolicy');

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary/70">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToHome')}
        </Link>

        <div className="bg-primary-foreground/5 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-primary-foreground/10">
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
            {t('title')}
          </h1>
          <p className="text-primary-foreground/60 mb-8">
            {t('lastUpdated')}
          </p>

          {/* Section 1: Data Controller */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-primary-foreground mb-3">
              {t('controller.title')}
            </h2>
            <p className="text-primary-foreground/80 leading-relaxed">
              {t('controller.description')}
            </p>
          </section>

          {/* Section 2: Data Collected */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-primary-foreground mb-3">
              {t('dataCollected.title')}
            </h2>
            <p className="text-primary-foreground/80 leading-relaxed mb-3">
              {t('dataCollected.description')}
            </p>
            <ul className="list-disc list-inside text-primary-foreground/80 space-y-1 ml-4">
              <li>{t('dataCollected.items.name')}</li>
              <li>{t('dataCollected.items.email')}</li>
              <li>{t('dataCollected.items.subject')}</li>
              <li>{t('dataCollected.items.message')}</li>
            </ul>
            <p className="text-primary-foreground/80 leading-relaxed mt-3">
              {t('dataCollected.mandatory')}
            </p>
          </section>

          {/* Section 3: Purposes */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-primary-foreground mb-3">
              {t('purposes.title')}
            </h2>
            <p className="text-primary-foreground/80 leading-relaxed mb-3">
              {t('purposes.description')}
            </p>
            <ul className="list-disc list-inside text-primary-foreground/80 space-y-1 ml-4">
              <li>{t('purposes.items.respond')}</li>
              <li>{t('purposes.items.manage')}</li>
            </ul>
          </section>

          {/* Section 4: Legal Basis */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-primary-foreground mb-3">
              {t('legalBasis.title')}
            </h2>
            <p className="text-primary-foreground/80 leading-relaxed">
              {t('legalBasis.description')}
            </p>
          </section>

          {/* Section 5: Recipients */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-primary-foreground mb-3">
              {t('recipients.title')}
            </h2>
            <p className="text-primary-foreground/80 leading-relaxed">
              {t('recipients.description')}
            </p>
          </section>

          {/* Section 6: Retention */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-primary-foreground mb-3">
              {t('retention.title')}
            </h2>
            <p className="text-primary-foreground/80 leading-relaxed">
              {t('retention.description')}
            </p>
          </section>

          {/* Section 7: Rights */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-primary-foreground mb-3">
              {t('rights.title')}
            </h2>
            <p className="text-primary-foreground/80 leading-relaxed mb-3">
              {t('rights.description')}
            </p>
            <ul className="list-disc list-inside text-primary-foreground/80 space-y-1 ml-4">
              <li>{t('rights.items.access')}</li>
              <li>{t('rights.items.rectification')}</li>
              <li>{t('rights.items.erasure')}</li>
              <li>{t('rights.items.restriction')}</li>
              <li>{t('rights.items.portability')}</li>
              <li>{t('rights.items.opposition')}</li>
            </ul>
            <p className="text-primary-foreground/80 leading-relaxed mt-3">
              {t('rights.howTo')}
            </p>
          </section>

          {/* Section 8: CNIL Complaint */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-primary-foreground mb-3">
              {t('complaint.title')}
            </h2>
            <p className="text-primary-foreground/80 leading-relaxed">
              {t('complaint.description')}
            </p>
          </section>

          {/* Section 9: Cookies */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-primary-foreground mb-3">
              {t('cookies.title')}
            </h2>
            <p className="text-primary-foreground/80 leading-relaxed">
              {t('cookies.description')}
            </p>
          </section>

          {/* Section 10: Updates */}
          <section>
            <h2 className="text-xl font-semibold text-primary-foreground mb-3">
              {t('updates.title')}
            </h2>
            <p className="text-primary-foreground/80 leading-relaxed">
              {t('updates.description')}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
