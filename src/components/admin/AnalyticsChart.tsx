import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1'];

const tooltipStyle = {
  backgroundColor: 'hsl(222, 47%, 14%)',
  border: '1px solid hsl(222, 30%, 22%)',
  color: '#fff',
  borderRadius: '6px',
  fontSize: '12px',
};

interface ChartData {
  name: string;
  value: number;
}

export function BarChartCard({ title, data, layout = 'vertical' as 'vertical' | 'horizontal', color = '#3b82f6' }: { title: string; data: ChartData[]; layout?: 'vertical' | 'horizontal'; color?: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="h-64">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No data yet</div>
        ) : layout === 'horizontal' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 22%)" />
              <XAxis type="number" stroke="hsl(215, 20%, 65%)" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="hsl(215, 20%, 65%)" fontSize={11} width={100} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 22%)" />
              <XAxis dataKey="name" stroke="hsl(215, 20%, 65%)" fontSize={12} />
              <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function PieChartCard({ title, data }: { title: string; data: ChartData[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="h-64">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function LineChartCard({ title, data, dataKey = 'value' }: { title: string; data: ChartData[]; dataKey?: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="h-64">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 22%)" />
              <XAxis dataKey="name" stroke="hsl(215, 20%, 65%)" fontSize={12} />
              <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey={dataKey} stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
