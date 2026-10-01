type Props = {
  index: string;
  children: string;
};

export function SectionLabel({ index, children }: Props) {
  return (
    <div className="section-label" aria-label={`${index} ${children}`}>
      <span>{index}</span>
      <span aria-hidden="true">/</span>
      <span>{children}</span>
    </div>
  );
}
