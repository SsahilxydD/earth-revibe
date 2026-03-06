'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// GSAP is lazy-loaded to improve initial page load performance
// This reduces the main bundle size significantly

const values = [
  {
    title: 'Quality First',
    description: 'Every piece is crafted from premium materials, designed to last beyond seasons and trends.',
  },
  {
    title: 'Sustainable Practice',
    description: 'We partner with ethical manufacturers and use eco-conscious materials wherever possible.',
  },
  {
    title: 'Timeless Design',
    description: 'Our pieces are designed to transcend trends, becoming wardrobe staples you\'ll reach for again and again.',
  },
  {
    title: 'Fair Pricing',
    description: 'By selling directly to you, we offer premium quality at a fraction of traditional luxury pricing.',
  },
];

const stats = [
  { number: 2019, label: 'Founded', suffix: '' },
  { number: 50, label: 'Happy Customers', suffix: 'K+' },
  { number: 12, label: 'Countries', suffix: '' },
  { number: 100, label: 'Sustainable Cotton', suffix: '%' },
];

export default function AboutPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const heroImageRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ctx: any = null;
    // Lazy load GSAP to reduce initial bundle size
    // This significantly improves PageSpeed Insights scores
    const initAnimations = async () => {
      try {
        // Dynamically import GSAP modules
        const [gsapImport, scrollTriggerImport] = await Promise.all([
          import('gsap'),
          import('gsap/ScrollTrigger'),
        ]);

        const gsap = gsapImport.gsap;
        const ScrollTrigger = scrollTriggerImport.ScrollTrigger;
        gsap.registerPlugin(ScrollTrigger);

        ctx = gsap.context(() => {
          // Hero parallax effect
          const heroImage = document.querySelector('.about-hero-image');
          if (heroImage) {
            gsap.to(heroImage, {
              yPercent: 30,
              ease: 'none',
              scrollTrigger: {
                trigger: '.about-hero',
                start: 'top top',
                end: 'bottom top',
                scrub: 1.5,
              },
            });
          }

          // Hero text reveal
          gsap.fromTo('.about-hero-title',
            { y: 80, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 1.2,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: '.about-hero',
                start: 'top 80%',
              },
            }
          );

          gsap.fromTo('.about-hero-subtitle',
            { y: 40, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 1,
              delay: 0.3,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: '.about-hero',
                start: 'top 80%',
              },
            }
          );

          // Mission section - text reveal
          gsap.fromTo('.mission-label',
            { y: 30, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: '.mission-section',
                start: 'top 70%',
              },
            }
          );

          gsap.fromTo('.mission-quote',
            { y: 50, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 1,
              delay: 0.2,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: '.mission-section',
                start: 'top 70%',
              },
            }
          );

          gsap.fromTo('.mission-text',
            { y: 30, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              delay: 0.4,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: '.mission-section',
                start: 'top 70%',
              },
            }
          );

          // Stats counter animation
          const statNumbers = document.querySelectorAll('.stat-number');
          statNumbers.forEach((stat) => {
            const target = parseInt(stat.getAttribute('data-target') || '0');
            const suffix = stat.getAttribute('data-suffix') || '';

            gsap.fromTo(stat,
              { innerText: 0 },
              {
                innerText: target,
                duration: 2,
                ease: 'power2.out',
                snap: { innerText: 1 },
                scrollTrigger: {
                  trigger: '.stats-section',
                  start: 'top 80%',
                },
                onUpdate: function() {
                  const currentValue = Math.round(gsap.getProperty(stat, 'innerText') as number);
                  stat.textContent = currentValue + suffix;
                },
              }
            );
          });

          // Story section - image parallax
          const storyImages = document.querySelectorAll('.story-image');
          storyImages.forEach((image) => {
            gsap.to(image, {
              yPercent: -15,
              ease: 'none',
              scrollTrigger: {
                trigger: image.parentElement,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1,
              },
            });
          });

          // Story text reveal with stagger
          gsap.fromTo('.story-text-block p',
            { y: 40, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              stagger: 0.15,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: '.story-section',
                start: 'top 60%',
              },
            }
          );

          // Values section - staggered reveal
          gsap.fromTo('.value-card',
            { y: 60, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              stagger: 0.1,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: '.values-section',
                start: 'top 70%',
              },
            }
          );

          // Materials section - image scale
          const materialsImage = document.querySelector('.materials-image');
          if (materialsImage) {
            gsap.fromTo(materialsImage,
              { scale: 1.2 },
              {
                scale: 1,
                ease: 'none',
                scrollTrigger: {
                  trigger: '.materials-section',
                  start: 'top bottom',
                  end: 'top 20%',
                  scrub: 1,
                },
              }
            );
          }

          // Materials text items - staggered reveal
          gsap.fromTo('.material-item',
            { x: 50, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: 0.8,
              stagger: 0.15,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: '.materials-section',
                start: 'top 50%',
              },
            }
          );

          // CTA section
          gsap.fromTo('.cta-content',
            { y: 50, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 1,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: '.cta-section',
                start: 'top 80%',
              },
            }
          );

        }, pageRef);
      } catch (error) {
        // GSAP failed to load, animations will be skipped gracefully
        console.warn('GSAP animations disabled:', error);
      }
    };

    // Defer GSAP initialization to improve initial page load
    const timeoutId = setTimeout(initAnimations, 100);

    return () => {
      clearTimeout(timeoutId);
      if (ctx) ctx.revert();
    };
  }, []);

  return (
    <div ref={pageRef} className="min-h-screen bg-white pt-16">
      {/* Hero Section */}
      <div className="about-hero relative h-[50vh] lg:h-[70vh] bg-slate-100 overflow-hidden">
        <div ref={heroImageRef} className="absolute inset-0">
          <Image
            src="/poster1.png"
            alt="Earth Revibe"
            fill
            className="about-hero-image object-cover object-center scale-110"
          />
        </div>
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-6">
            <h1 className="about-hero-title text-[28px] lg:text-[42px] font-[var(--font-cinzel)] font-medium tracking-[0.06em] text-white mb-4">
              Our Story
            </h1>
            <p className="about-hero-subtitle text-[13px] lg:text-[15px] text-white/80 max-w-md mx-auto">
              Crafting essentials for those who appreciate understated elegance
            </p>
          </div>
        </div>
      </div>

      {/* Mission Statement */}
      <div className="mission-section px-6 py-16 lg:py-24 lg:px-10">
        <div className="max-w-3xl mx-auto text-center">
          <p className="mission-label text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-slate-400 mb-6">
            Our Mission
          </p>
          <h2 className="mission-quote text-[20px] lg:text-[28px] font-[var(--font-cinzel)] font-medium tracking-[0.02em] text-black leading-relaxed mb-8">
            &quot;To create timeless essentials that honor both the wearer and the planet.&quot;
          </h2>
          <p className="mission-text text-[14px] lg:text-[15px] text-slate-600 leading-[1.9] max-w-2xl mx-auto">
            Earth Revibe was born from a simple belief: that everyday clothing can be extraordinary.
            We set out to create a collection of essentials that feel luxurious, look effortless,
            and are made to last.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div ref={statsRef} className="stats-section px-6 py-12 bg-slate-50 lg:py-16 lg:px-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="text-center"
              >
                <p
                  className="stat-number text-[32px] lg:text-[42px] font-light text-black mb-2"
                  data-target={stat.number}
                  data-suffix={stat.suffix}
                >
                  0{stat.suffix}
                </p>
                <p className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-slate-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Story Section */}
      <div className="story-section px-6 py-16 lg:py-24 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="story-text-block order-2 lg:order-1">
              <p className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-slate-400 mb-4">
                How It Started
              </p>
              <h2 className="text-[20px] lg:text-[24px] font-[var(--font-cinzel)] font-medium tracking-[0.02em] text-black mb-6">
                Built on Quality, Not Quantity
              </h2>
              <div className="space-y-4 text-[14px] text-slate-600 leading-[1.9]">
                <p>
                  In 2019, we started with a single question: why is it so hard to find
                  well-made basics? Fast fashion promised affordability but delivered
                  clothes that fell apart. Luxury brands offered quality but at prices
                  that felt exclusionary.
                </p>
                <p>
                  We believed there had to be a better way. By working directly with
                  manufacturers, cutting out middlemen, and focusing on what matters—quality
                  materials and honest craftsmanship—we created Earth Revibe.
                </p>
                <p>
                  Today, we ship to customers in over 12 countries, but our mission
                  remains the same: to make premium essentials accessible to everyone.
                </p>
              </div>
            </div>
            <div className="order-1 lg:order-2 overflow-hidden">
              <div className="aspect-[4/5] relative bg-slate-100">
                <Image
                  src="/poster2.png"
                  alt="Our Story"
                  fill
                  className="story-image object-cover scale-110"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="values-section px-6 py-16 bg-black lg:py-24 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 lg:mb-16">
            <p className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-slate-500 mb-4">
              What We Stand For
            </p>
            <h2 className="text-[20px] lg:text-[28px] font-[var(--font-cinzel)] font-medium tracking-[0.02em] text-white">
              Our Values
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <div
                key={value.title}
                className="value-card text-center lg:text-left"
              >
                <h3 className="text-[13px] font-[var(--font-cinzel)] font-medium tracking-[0.08em] uppercase text-white mb-3">
                  {value.title}
                </h3>
                <p className="text-[13px] text-slate-400 leading-[1.8]">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Materials Section */}
      <div className="materials-section px-6 py-16 lg:py-24 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="overflow-hidden">
              <div className="aspect-[4/5] relative bg-slate-100">
                <Image
                  src="/poster3.png"
                  alt="Premium Materials"
                  fill
                  className="materials-image object-cover"
                />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-slate-400 mb-4">
                Premium Materials
              </p>
              <h2 className="text-[20px] lg:text-[24px] font-[var(--font-cinzel)] font-medium tracking-[0.02em] text-black mb-6">
                The Fabrics We Love
              </h2>
              <div className="space-y-6">
                <div className="material-item pb-6 border-b border-slate-100">
                  <h3 className="text-[12px] font-[var(--font-cinzel)] font-medium tracking-[0.08em] uppercase text-black mb-2">
                    Supima Cotton
                  </h3>
                  <p className="text-[13px] text-slate-600 leading-[1.8]">
                    Known for its exceptional softness and durability, Supima cotton makes up
                    less than 1% of cotton grown worldwide. We use it in all our tees.
                  </p>
                </div>
                <div className="material-item pb-6 border-b border-slate-100">
                  <h3 className="text-[12px] font-[var(--font-cinzel)] font-medium tracking-[0.08em] uppercase text-black mb-2">
                    Japanese Denim
                  </h3>
                  <p className="text-[13px] text-slate-600 leading-[1.8]">
                    Sourced from heritage mills in Japan, our denim is crafted using
                    traditional techniques that create a uniquely soft hand-feel.
                  </p>
                </div>
                <div className="material-item">
                  <h3 className="text-[12px] font-[var(--font-cinzel)] font-medium tracking-[0.08em] uppercase text-black mb-2">
                    Belgian Linen
                  </h3>
                  <p className="text-[13px] text-slate-600 leading-[1.8]">
                    Our linen is woven in Belgium from flax grown without irrigation,
                    resulting in a luxuriously breathable fabric.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="cta-section px-6 py-16 bg-slate-50 lg:py-20 lg:px-10">
        <div className="max-w-2xl mx-auto text-center">
          <div className="cta-content">
            <h2 className="text-[18px] lg:text-[24px] font-[var(--font-cinzel)] font-medium tracking-[0.02em] text-black mb-4">
              Experience the Difference
            </h2>
            <p className="text-[14px] text-slate-600 mb-8">
              Join thousands of customers who&apos;ve upgraded their everyday essentials.
            </p>
            <Link
              href="/products"
              className="inline-block px-10 py-4 bg-black text-white text-[11px] font-medium tracking-[0.08em] uppercase hover:bg-slate-800 transition-colors"
            >
              Shop Collection
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
