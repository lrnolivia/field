type Props = {
  title: string;
  detail: string;
};

export default function EmptyState({ title, detail }: Props) {
  return (
    <div className="field-dashboard-empty" role="status">
      <div className="field-dashboard-empty-mark" aria-hidden="true">f</div>
      <strong role="heading" aria-level={2}>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}
