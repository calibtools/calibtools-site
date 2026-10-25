import { Star } from '@/lib/icons';

interface Props {
  rating: number;
  max?: number;
  size?: number;
  className?: string;
}

export default function Stars({ rating, max = 5, size = 14, className = '' }: Props) {
  return (
    <span
      className={`inline-flex gap-0.5 ${className}`}
      aria-label={`${rating} out of ${max} stars`}
    >
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={0}
          fill={i < rating ? '#E60012' : '#D4D4D4'}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
