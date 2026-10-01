type Props = {
  label: string;
  ratio?: "landscape" | "portrait" | "cinematic" | "panorama";
};

export function MediaPlaceholder({ label, ratio = "landscape" }: Props) {
  return (
    <div className={`media-placeholder media-placeholder--${ratio}`} role="img" aria-label={label}>
      <span className="media-placeholder__line" />
      <span className="media-placeholder__label">{label}</span>
    </div>
  );
}
