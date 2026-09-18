export const officialSiteUrl = "https://drfredmartins.com.br";
export const officialImageUrl = `${officialSiteUrl}/favicon.svg`;

export type SeoOptions = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "profile";
  twitterCard?: "summary" | "summary_large_image";
  image?: string;
};

export function createSeoHead({
  title,
  description,
  path,
  type = "website",
  twitterCard = "summary_large_image",
  image = officialImageUrl,
}: SeoOptions) {
  const url = `${officialSiteUrl}${path === "/" ? "/" : path}`;

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { property: "og:url", content: url },
      { property: "og:site_name", content: "Espaço de Saúde Integrativa Dr. Frederick Parreira" },
      ...(image ? [{ property: "og:image", content: image }] : []),
      { name: "twitter:card", content: twitterCard },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...(twitterCard === "summary_large_image" && image ? [{ name: "twitter:image", content: image }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["LocalBusiness", "HealthAndBeautyBusiness"],
      "@id": `${officialSiteUrl}/#business`,
      name: "Espaço de Saúde Integrativa Dr. Frederick Parreira",
      url: officialSiteUrl,
      image: officialImageUrl,
      telephone: "+55 32 99193-1779",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Rua Fernando Lobo, 102, Sala 704",
        addressLocality: "Juiz de Fora",
        addressRegion: "MG",
        addressCountry: "BR",
      },
      areaServed: {
        "@type": "City",
        name: "Juiz de Fora",
        containedInPlace: {
          "@type": "State",
          name: "Minas Gerais",
        },
      },
    },
    {
      "@type": "Person",
      "@id": `${officialSiteUrl}/#person`,
      name: "Dr. Frederick Parreira",
      url: officialSiteUrl,
      image: officialImageUrl,
      jobTitle: "Psicólogo e Biomédico",
      worksFor: { "@id": `${officialSiteUrl}/#business` },
    },
  ],
};
