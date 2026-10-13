type Props = {
  className?: string;
};

export default function SkeletonSurface({ className = '' }: Props) {
  return <span className={`field-skeleton-surface ${className}`.trim()} aria-hidden="true" />;
}
