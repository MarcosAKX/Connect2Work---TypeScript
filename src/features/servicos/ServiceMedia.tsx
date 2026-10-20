interface ServiceMediaProps {
  imageUrl: string | null;
  alt: string;
}

export function ServiceMedia({ imageUrl, alt }: ServiceMediaProps) {
  return imageUrl ? (
    <img className="service-showcase__image" src={imageUrl} alt={alt} />
  ) : (
    <div className="service-showcase__image-fallback" role="img" aria-label={`${alt}. Imagem ainda não cadastrada.`}>
      <span>C2W</span>
      <small>Imagem disponível após cadastro administrativo</small>
    </div>
  );
}
