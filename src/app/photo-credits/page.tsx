import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { features } from "@/features/config";
import modelPhotos from "@/features/fixed-price-catalog/photo-sources.json";
import brandPhotos from "@/features/fixed-price-catalog/brand-photo-sources.json";

export const metadata: Metadata = { title: "Источники фотографий · BCC Leasing" };

type Credit = {
  brand: string;
  model: string;
  localPath: string;
  sourcePageUrl: string;
  credit?: string;
  license?: string;
  licenseUrl?: string;
};

export default function PhotoCreditsPage() {
  if (!features.fixedPriceCatalog) notFound();
  const photos: Credit[] = [...Object.values(modelPhotos), ...Object.values(brandPhotos)];
  return (
    <main className="photo-credits-page">
      <Link href="/">← К калькулятору</Link>
      <h1>Источники фотографий</h1>
      <p>
        В каталоге используются фотографии моделей и иллюстрации марок. Изображение может отличаться
        от выбранного автомобиля и комплектации. Фотографии используются без изменений, с
        масштабированием для отображения.
      </p>
      <ul className="photo-credits-list">
        {photos.map((photo) => (
          <li key={photo.localPath}>
            <h2>
              {photo.brand} {photo.model}
            </h2>
            <a href={photo.sourcePageUrl} target="_blank" rel="noreferrer">
              {photo.credit ? `Фото: ${photo.credit}` : "Источник фотографии"}
            </a>
            {photo.license && photo.licenseUrl && (
              <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
                {photo.license}
              </a>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
