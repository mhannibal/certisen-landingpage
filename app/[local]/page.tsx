import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Network, Zap, Shield, BarChart3, GitBranch, Play, Building2, MapPin, Mail, Phone } from "lucide-react";
import ParticlesBackground from "@/components/ParticlesBackground";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import ContactForm from "@/components/ContactForm";
import type { Metadata } from 'next';
import AutoAnimation from '@/components/autoAnimation';
import SolutionDiagram from '@/components/SolutionDiagram';
import TSNNetworkDemoWrapper from '@/components/TSNNetworkDemoWrapper';
import Image from 'next/image';

export async function generateMetadata({ params }: { params: Promise<{ local: string }> }): Promise<Metadata> {
  const { local } = await params;
  const t = await getTranslations('homePage');

  const baseUrl = 'https://certisen.com';
  const locale = local || 'en';

  return {
    title: t('title'),
    description: t('description'),
    keywords: [
      'TSN certification',
      'Time-Sensitive Networking',
      'IEEE 802.1Qbv',
      'ASIL-D',
      'formal verification',
      'AI network optimization',
      'automotive Ethernet',
      'deterministic networking',
      'safety-critical systems',
      'OTA certification',
      'network validation',
      'TSN configuration',
      'real-time communication',
      'industrial automation',
      'EAL7+ certification',
      'cyber security',
      'electric vehicles',
      'Industry 4.0',
      'aerospace networking',
      'TSN simulator',
      'network topology design',
      'Gate Control List',
      'traffic scheduling',
    ],
    authors: [{ name: 'CertiSen', url: baseUrl }],
    creator: 'CertiSen',
    publisher: 'CertiSen',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        'en': `${baseUrl}/en`,
        'fr': `${baseUrl}/fr`,
        'zh': `${baseUrl}/zh`,
      },
    },
    openGraph: {
      type: 'website',
      locale: locale === 'fr' ? 'fr_FR' : locale === 'zh' ? 'zh_CN' : 'en_US',
      url: `${baseUrl}/${locale}`,
      title: t('title'),
      description: t('description'),
      siteName: 'CertiSen',
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: 'CertiSen - TSN Network Certification Platform',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      creator: '@certisen',
      images: [`${baseUrl}/og-image.png`],
    },
    verification: {
      google: 'your-google-verification-code',
    },
    other: {
      'application-name': 'CertiSen',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
      'apple-mobile-web-app-title': 'CertiSen',
      'format-detection': 'telephone=no',
      'mobile-web-app-capable': 'yes',
    },
  };
}

export default function Home() {
  const t = useTranslations('homePage');



  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'CertiSen',
    applicationCategory: 'EngineeringApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      priceSpecification: {
        '@type': 'PriceSpecification',
        price: '0',
        priceCurrency: 'EUR',
      },
    },
    description: t('description'),
    url: 'https://certisen.com',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
      bestRating: '5',
      worstRating: '1',
    },
    featureList: [
      'Visual TSN Network Design',
      'Formal Mathematical Verification',
      'AI-Powered Network Optimization',
      'ASIL-D / EAL7+ Certification',
      'OTA Continuous Certification',
      'Real-Time Network Simulation',
      'IEEE 802.1Qbv Gate Control List Configuration',
      'Traffic Flow Management',
      'Cyber Security Validation',
      'Multi-Format Export',
    ],
    audience: {
      '@type': 'Audience',
      audienceType: [
        'Network Engineers',
        'TSN Specialists',
        'System Integrators',
        'Automotive Engineers',
        'Aerospace Engineers',
        'Industrial Automation Professionals',
        'Researchers',
      ],
    },
    applicationSubCategory: [
      'Network Design',
      'Safety Certification',
      'Real-Time Systems',
      'Industrial Automation',
    ],
    potentialAction: {
      '@type': 'UseAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://certisen.com',
      },
    },
  };

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'CertiSen',
    url: 'https://certisen.com',
    logo: 'https://certisen.com/certisenlogo.png',
    description: 'CertiSen develops safety certification technology for TSN Ethernet networks in electric vehicles and other critical systems.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '655 Av. de l\'Europe',
      addressLocality: 'Montbonnot-Saint-Martin',
      postalCode: '38330',
      addressRegion: 'Grenoble',
      addressCountry: 'FR',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'contact@certisen.com',
      contactType: 'Customer Service',
      availableLanguage: ['English', 'French', 'Chinese'],
    },
    sameAs: [
      'https://www.linkedin.com/company/certisen',
      'https://twitter.com/certisen',
    ],
    founder: {
      '@type': 'Organization',
      name: 'INRIA',
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://certisen.com',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-b from-primary to-primary/70">
        <ParticlesBackground />

        {/* Language Switcher - Fixed Position */}
        <div className="fixed top-4 right-4 z-50">
        </div>

        {/* Hero Section */}
        <section className="relative container mx-auto px-4 py-20 overflow-hidden">
          <div className="relative z-10 flex flex-col items-center text-center space-y-8">
            <Image src="/certisenlogo.png" alt="CertiSen Logo" width={150} height={150} priority />
    
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-primary-foreground">
              {t('title')}
            </h1>

            <p className="text-xl text-primary-foreground/80 max-w-2xl">
              {t('description')}
            </p>


          </div>
        </section>



        <section className="relative  container mx-auto px-4 py-20 ">

          <AutoAnimation />

        </section>






        {/* Features Section */}
        <section className="container mx-auto px-4 py-20 ">
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



        {/* TSN Network Editor Demo */}
        <section className="container mx-auto px-2 py-40">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-3xl font-semibold mb-4 text-primary-foreground">
               {t('solution.title')}
            </h2>
            <h2 className="text-4xl md:text-4xl font-bold mb-4 text-primary-foreground">
            
            </h2>
          </div>
          <div className="max-w-8xl mx-auto">
            <TSNNetworkDemoWrapper />
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
              subjectPlaceholder: t('contact.subjectPlaceholder'),
              error: t('contact.error'),
              namePlaceholder: t('contact.namePlaceholder'),
              emailPlaceholder: t('contact.emailPlaceholder'),
              messagePlaceholder: t('contact.messagePlaceholder'),
            }}
          />
        </section>

        {/* Sponsors Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-primary-foreground">
              {t('sponsors.title')}
            </h2>
       
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-70 hover:opacity-100 transition-opacity">
            {/* Placeholder sponsor logos - replace with actual logos */}
            
            <div className="w-32 h-16 flex items-center justify-center bg-white p-4 rounded-lg  border-primary-foreground/10 hover:border-primary-foreground/30 transition-colors">
              <Image
                src={'/inria.png'}
                alt='INRIA Logo - CertiSen Research Partner and Founder'
                width={200}
                height={200}
              />
            </div>
            
          </div>
        </section>

        {/* Address Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="bg-primary-foreground/5 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-primary-foreground/10">
              <h2 className="text-3xl font-bold mb-8 text-primary-foreground text-center">
                {t('address.title')}
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <MapPin className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-primary-foreground mb-2">{t('address.location')}</h3>
                      <p className="text-primary-foreground/80">
                        655 Av. de l'Europe, 38330 Montbonnot-Saint-Martin<br />
                        Grenoble<br />
                        France
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <Mail className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-primary-foreground mb-2">{t('address.email')}</h3>
                      <a href="mailto:contact@certisen.com" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                        contact@certisen.com
                      </a>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>
          </div>
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
