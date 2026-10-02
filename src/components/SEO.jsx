import { useEffect, useState } from 'react';
import { api } from '../api.js';

// Fallback defaults so tags render instantly even before network returns
const CLIENT_SEO_DEFAULTS = {
  home: {
    metaTitle: 'Sulax Shoes - Premium Footwear in Nepal | Sneakers, Boots & Formal',
    metaDescription: 'Shop top quality sneakers, boots, sandals, and formal shoes at Sulax Shoes Nepal. Best prices, fast nationwide cash on delivery, and 100% authentic footwear.',
    metaKeywords: 'shoes nepal, sneakers kathmandu, footwear online nepal, boots nepal, sulax shoes, buy shoes online',
    canonicalUrl: 'https://sulaxshoes.com/',
    robots: 'index, follow',
    ogTitle: 'Sulax Shoes Nepal - Step Up Your Style',
    ogDescription: 'Discover the finest collection of trendy footwear. Quality, comfort, and affordable prices in Nepal.',
    ogImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&auto=format&fit=crop&q=80',
    twitterCard: 'summary_large_image',
    schemaJson: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Sulax Shoes',
      url: 'https://sulaxshoes.com',
      description: 'Premium footwear store in Nepal.',
    }),
  },
  products: {
    metaTitle: 'Shop All Shoes & Footwear Collection | Sulax Nepal',
    metaDescription: 'Explore the complete range of men and women footwear at Sulax Nepal. Filter by category, price, and latest arrivals.',
    metaKeywords: 'all shoes, running shoes, casual sneakers, boots, sandals nepal, online shoe store',
    canonicalUrl: 'https://sulaxshoes.com/products',
    robots: 'index, follow',
    ogTitle: 'All Shoes Collection | Sulax Nepal',
    ogDescription: 'Find your perfect pair from our wide selection of sneakers, boots, and casual shoes.',
    ogImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1200&auto=format&fit=crop&q=80',
    twitterCard: 'summary_large_image',
  },
  product_details: {
    metaTitle: 'Product Details | Sulax Shoes Nepal',
    metaDescription: 'Buy premium footwear at Sulax Shoes Nepal. Fast delivery with cash on delivery available.',
    metaKeywords: 'buy shoes nepal, footwear, sneaker store, authentic shoes kathmandu',
    canonicalUrl: 'https://sulaxshoes.com/product',
    robots: 'index, follow',
    ogTitle: 'Sulax Shoes - Footwear Collection',
    ogDescription: 'Comfortable, durable and stylish footwear.',
    ogImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200',
    twitterCard: 'summary_large_image',
  },
  contact: {
    metaTitle: 'Contact Sulax Shoes Nepal | Customer Support & Location',
    metaDescription: 'Have queries or need help with your shoe order? Contact the Sulax Shoes Nepal team via phone, email, or visit our Kathmandu location.',
    metaKeywords: 'contact sulax, shoe store kathmandu, customer care footwear, shoe store nepal',
    canonicalUrl: 'https://sulaxshoes.com/contact',
    robots: 'index, follow',
    ogTitle: 'Contact Us - Sulax Shoes Support',
    ogDescription: 'Get in touch with Sulax Shoes for orders, sizing help, and inquiries.',
    ogImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200',
    twitterCard: 'summary',
  },
  cart: {
    metaTitle: 'Your Shopping Cart | Sulax Shoes',
    metaDescription: 'Review selected items in your cart and proceed to secure checkout on Sulax Shoes.',
    canonicalUrl: 'https://sulaxshoes.com/cart',
    robots: 'noindex, follow',
    ogTitle: 'Shopping Cart - Sulax Shoes',
  },
  checkout: {
    metaTitle: 'Secure Checkout | Sulax Shoes Nepal',
    metaDescription: 'Complete your shoe order with cash on delivery or online payment at Sulax Shoes.',
    canonicalUrl: 'https://sulaxshoes.com/checkout',
    robots: 'noindex, nofollow',
    ogTitle: 'Checkout - Sulax Shoes',
  },
  account: {
    metaTitle: 'My Account & Profile | Sulax Shoes',
    metaDescription: 'Manage your Sulax account, orders, delivery address, and profile settings.',
    canonicalUrl: 'https://sulaxshoes.com/account',
    robots: 'noindex, nofollow',
    ogTitle: 'My Account - Sulax Shoes',
  },
  wishlist: {
    metaTitle: 'My Wishlist | Sulax Shoes Nepal',
    metaDescription: 'View and manage your favorite shoes saved to your Sulax wishlist.',
    canonicalUrl: 'https://sulaxshoes.com/wishlist',
    robots: 'noindex, follow',
    ogTitle: 'My Wishlist - Sulax Shoes',
  },
};

function setMetaTag(nameOrProperty, value, isProperty = false) {
  if (!value) return;
  const attribute = isProperty ? 'property' : 'name';
  let tag = document.querySelector(`meta[${attribute}="${nameOrProperty}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, nameOrProperty);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', value);
}

function setCanonical(url) {
  if (!url) return;
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function setJsonLd(jsonString) {
  const SCRIPT_ID = 'sulax-jsonld-schema';
  let script = document.getElementById(SCRIPT_ID);
  if (!jsonString) {
    if (script) script.remove();
    return;
  }
  if (!script) {
    script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = typeof jsonString === 'string' ? jsonString : JSON.stringify(jsonString, null, 2);
}

export default function SEO({
  page = 'home',
  title,
  description,
  keywords,
  canonical,
  robots,
  ogTitle,
  ogDescription,
  ogImage,
  twitterCard,
  schema,
}) {
  const [dbSeo, setDbSeo] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (page) {
      api
        .get(`/seo/${page}`)
        .then((res) => {
          if (isMounted && res.seo) {
            setDbSeo(res.seo);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [page]);

  useEffect(() => {
    const base = (page && (dbSeo || CLIENT_SEO_DEFAULTS[page])) || {};

    const finalTitle = title || base.metaTitle || 'Sulax Shoes Collection';
    const finalDesc = description || base.metaDescription || '';
    const finalKeywords = keywords || base.metaKeywords || '';
    const finalCanonical = canonical || base.canonicalUrl || (typeof window !== 'undefined' ? window.location.href : '');
    const finalRobots = robots || base.robots || 'index, follow';
    const finalOgTitle = ogTitle || base.ogTitle || finalTitle;
    const finalOgDesc = ogDescription || base.ogDescription || finalDesc;
    const finalOgImage = ogImage || base.ogImage || '';
    const finalTwitterCard = twitterCard || base.twitterCard || 'summary_large_image';
    const finalSchema = schema || base.schemaJson || '';

    // Document Title
    document.title = finalTitle;

    // Meta Standard
    setMetaTag('description', finalDesc);
    setMetaTag('keywords', finalKeywords);
    setMetaTag('robots', finalRobots);
    setCanonical(finalCanonical);

    // Open Graph
    setMetaTag('og:title', finalOgTitle, true);
    setMetaTag('og:description', finalOgDesc, true);
    setMetaTag('og:image', finalOgImage, true);
    setMetaTag('og:url', finalCanonical, true);
    setMetaTag('og:type', 'website', true);
    setMetaTag('og:site_name', 'Sulax Shoes', true);

    // Twitter Card
    setMetaTag('twitter:card', finalTwitterCard);
    setMetaTag('twitter:title', finalOgTitle);
    setMetaTag('twitter:description', finalOgDesc);
    setMetaTag('twitter:image', finalOgImage);

    // Structured Data JSON-LD
    setJsonLd(finalSchema);
  }, [page, dbSeo, title, description, keywords, canonical, robots, ogTitle, ogDescription, ogImage, twitterCard, schema]);

  return null;
}
