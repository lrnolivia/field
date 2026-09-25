type Props = {
  title: string;
  detail: string;
};

export default function EmptyState({ title, detail }: Props) {
  return (
    <div className="field-dashboard-empty">
      <div className="field-dashboard-empty-mark" aria-hidden="true">f</div>
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}
