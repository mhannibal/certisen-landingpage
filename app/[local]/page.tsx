import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Network, Zap, Shield, BarChart3, GitBranch, Play } from "lucide-react";
import ParticlesBackground from "@/components/ParticlesBackground";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import ContactForm from "@/components/ContactForm";
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { local: string } }): Promise<Metadata> {
  const t = await getTranslations('homePage');
  
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: '/',
      languages: {
        'en': '/en',
        'fr': '/fr',
        'zh': '/zh',
      },
    },
  };
}

export default function Home() {
  const t = useTranslations('homePage');
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'CertiSen',
    applicationCategory: 'DeveloperApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: t('description'),
    operatingSystem: 'Web',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
    },
    featureList: [
      'Visual Network Design',
      'Formal Verification',
      'AI Optimization',
      'ASIL-D Certification',
      'Multi-Format Export',
      'Pre-Deployment Validation',
    ],
  };
  
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-b from-primary to-primary/70">
      <ParticlesBackground />
      
      {/* Language Switcher - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      
      {/* Hero Section */}
      <section className="relative container mx-auto px-4 py-20 overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center space-y-8">
          <img src="/logoDark2.svg" alt="CertiSen Logo" width={150} height={150} />
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-primary-foreground">
            {t('title')}
          </h1>
          
          <p className="text-xl text-primary-foreground/80 max-w-2xl">
            {t('description')}
          </p>
          
           
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary-foreground">
            {t('features.title')}
          </h2>
          <p className="text-primary-foreground/70 text-lg">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          
             <Card className="border-2 hover:border-primary-foreground/50 transition-colors bg-primary-foreground/10 backdrop-blur">
            <CardHeader>
              <Shield className="w-10 h-10 text-primary-foreground mb-2" />
              <CardTitle className="text-primary-foreground">{t('features.security.title')}</CardTitle>
              <CardDescription className="text-primary-foreground/70">
                {t('features.security.description')}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary-foreground/50 transition-colors bg-primary-foreground/10 backdrop-blur">
            <CardHeader>
              <Network className="w-10 h-10 text-primary-foreground mb-2" />
              <CardTitle className="text-primary-foreground">{t('features.visualDesign.title')}</CardTitle>
              <CardDescription className="text-primary-foreground/70">
                {t('features.visualDesign.description')}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary-foreground/50 transition-colors bg-primary-foreground/10 backdrop-blur">
            <CardHeader>
              <BarChart3 className="w-10 h-10 text-primary-foreground mb-2" />
              <CardTitle className="text-primary-foreground">{t('features.analytics.title')}</CardTitle>
              <CardDescription className="text-primary-foreground/70">
                {t('features.analytics.description')}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary-foreground/50 transition-colors bg-primary-foreground/10 backdrop-blur">
            <CardHeader>
              <GitBranch className="w-10 h-10 text-primary-foreground mb-2" />
              <CardTitle className="text-primary-foreground">{t('features.realTimeSimulation.title')}</CardTitle>
              <CardDescription className="text-primary-foreground/70">
                {t('features.realTimeSimulation.description')}
              </CardDescription>
            </CardHeader>
          </Card>

         
       

          <Card className="border-2 hover:border-primary-foreground/50 transition-colors bg-primary-foreground/10 backdrop-blur">
            <CardHeader>
              <Zap className="w-10 h-10 text-primary-foreground mb-2" />
              <CardTitle className="text-primary-foreground">{t('features.performance.title')}</CardTitle>
              <CardDescription className="text-primary-foreground/70">
                {t('features.performance.description')}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary-foreground/50 transition-colors bg-primary-foreground/10 backdrop-blur">
            <CardHeader>
              <Network className="w-10 h-10 text-primary-foreground mb-2" />
              <CardTitle className="text-primary-foreground">{t('features.export.title')}</CardTitle>
              <CardDescription className="text-primary-foreground/70">
                {t('features.export.description')}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

     
      {/* Contact Section */}
      <section className="container mx-auto px-4 py-20">
        <ContactForm
          labels={{
            title: t('contact.title'),
            subtitle: t('contact.subtitle'),
            name: t('contact.name'),
            email: t('contact.email'),
            subject: t('contact.subject'),
            message: t('contact.message'),
            send: t('contact.send'),
            sending: t('contact.sending'),
            success: t('contact.success'),
            error: t('contact.error'),
            namePlaceholder: t('contact.namePlaceholder'),
            emailPlaceholder: t('contact.emailPlaceholder'),
            subjectPlaceholder: t('contact.subjectPlaceholder'),
            messagePlaceholder: t('contact.messagePlaceholder'),
          }}
        />
      </section>

      {/* Footer */}
      <footer className="border-t border-primary-foreground/20 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-primary-foreground/70">
              {t('footer.copyright')}
            </p>
            <div className="flex gap-6 text-sm text-primary-foreground/70">
              
              <Link href="#" className="hover:text-primary-foreground transition-colors">
                {t('footer.privacy')}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
