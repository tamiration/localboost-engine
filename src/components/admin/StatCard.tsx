import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
  onClick?: () => void;
  alert?: boolean;
}

export function StatCard({ title, value, subtitle, icon, color, onClick, alert }: StatCardProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200 border-l-4',
        onClick && 'cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20',
        alert && 'bg-destructive/10'
      )}
      style={{ borderLeftColor: color }}
      onClick={onClick}
    >
      <div className="p-5">
        <span className="absolute top-3 right-4 text-2xl opacity-70">{icon}</span>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        <p className="text-sm font-medium text-muted-foreground mt-1">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    </Card>
  );
}
