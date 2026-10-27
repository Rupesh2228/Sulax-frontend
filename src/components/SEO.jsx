import { useEffect, useState } from 'react';
import { api } from '../api.js';

// Fallback defaults so tags render instantly even before network returns
const CLIENT_SEO_DEFAULTS = {
  home: {
    metaTitle: 'Sulax Shoes - Premium Footwear in Nepal | Sneakers, Boots & Formal',
    metaDescription: 'Shop top quality sneakers, boots, sandals, and formal shoes at Sulax Shoes Nepal. Best prices, fast nationwide cash on delivery, and 100% authentic footwear.',
  },
  category: {
    metaTitle: 'Shop All Shoes & Footwear Collection | Sulax Nepal',
    metaDescription: 'Explore the complete range of men and women footwear at Sulax Nepal. Filter by category, price, and latest arrivals.',
  },
  product: {
    metaTitle: 'Product Details | Sulax Shoes Nepal',
    metaDescription: 'Buy premium footwear at Sulax Shoes Nepal. Fast delivery with cash on delivery available.',
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
    document.title = finalTitle;
    setMetaTag('description', finalDesc);
    setJsonLd(schema || '');
  }, [page, dbSeo, title, description, schema]);

  return null;
}
