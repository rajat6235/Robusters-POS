'use client';

import { Badge } from '@/components/ui/badge';

interface OrderStatusBadgeProps {
  status: 'CONFIRMED' | 'CANCELLED';
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return {
          label: 'Confirmed',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 hover:bg-green-100'
        };
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 hover:bg-red-100'
        };
      default:
        return {
          label: status,
          variant: 'secondary' as const,
          className: ''
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className || ''}`}
    >
      {config.label}
    </Badge>
  );
}