import { getImageProps } from "next/image";

export function ArtDirectedHeroImage() {
  const common = { alt: "", sizes: "100vw" };
  const { props: { srcSet: desktop, ...image } } = getImageProps({
    ...common,
    src: "/images/brand/ggmarket-hero-desktop.webp",
    width: 1920,
    height: 1080,
    quality: 75,
  });
  return <picture className="campaign-hero-art">
    <source media="(min-width: 768px)" srcSet={desktop} />
    <img {...image} src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="" fetchPriority="high" />
  </picture>;
}
