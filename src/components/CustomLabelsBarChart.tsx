import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CustomLabel } from '../types/gmail';

interface CustomLabelsBarChartProps {
  labels: CustomLabel[];
  onLabelClick?: (labelId: string) => void;
}

interface ChartData {
  name: string;
  total: number;
  unread: number;
  labelId: string;
}

export function CustomLabelsBarChart({
  labels,
  onLabelClick
}: CustomLabelsBarChartProps) {

  const getNumericPrefix = (name: string): number => {
    const match = name.match(/^(\d+):/);
    return match ? parseInt(match[1], 10) : Infinity;
  };

  const chartData: ChartData[] = labels
    .map(label => ({
      name: label.name.length > 15 ? label.name.substring(0, 12) + '...' : label.name,
      total: label.messageCount,
      unread: label.unreadCount,
      labelId: label.id,
      sortOrder: getNumericPrefix(label.name)
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const handleBarClick = (data: any) => {
    if (data && data.labelId && onLabelClick) {
      onLabelClick(data.labelId);
    }
  };

  const textColor = '#9ca3af';
  const gridColor = '#374151';
  const tooltipBgColor = '#1f2937';
  const tooltipBorderColor = '#4b5563';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const fullLabel = labels.find(l =>
        l.name === payload[0].payload.name ||
        l.name.startsWith(payload[0].payload.name.replace('...', ''))
      );

      return (
        <div
          className="rounded-lg shadow-lg p-3 border"
          style={{
            backgroundColor: tooltipBgColor,
            borderColor: tooltipBorderColor
          }}
        >
          <p className="font-semibold mb-2" style={{ color: textColor }}>
            {fullLabel?.name || payload[0].payload.name}
          </p>
          <p className="text-sm" style={{ color: '#1B99CF' }}>
            Total: <span className="font-medium">{payload[0].value}</span>
          </p>
          <p className="text-sm" style={{ color: '#6b7280' }}>
            Unread: <span className="font-medium">{payload[1].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full">
      {chartData.length === 0 ? (
        <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
          <p>No data available for the selected period</p>
        </div>
      ) : (
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fill: textColor, fontSize: 12 }}
                stroke={gridColor}
              />
              <YAxis
                tick={{ fill: textColor, fontSize: 12 }}
                stroke={gridColor}
                allowDecimals={false}
                label={{
                  value: 'Message Count',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: textColor, fontSize: 12 }
                }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(55, 65, 81, 0.3)' }} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="square"
                formatter={(value) => (
                  <span style={{ color: textColor, fontSize: 14 }}>
                    {value === 'total' ? 'Total Messages' : 'Unread Messages'}
                  </span>
                )}
              />
              <Bar
                dataKey="total"
                fill="#1B99CF"
                radius={[8, 8, 0, 0]}
                cursor={onLabelClick ? 'pointer' : 'default'}
                onClick={handleBarClick}
              />
              <Bar
                dataKey="unread"
                fill="#6b7280"
                radius={[8, 8, 0, 0]}
                cursor={onLabelClick ? 'pointer' : 'default'}
                onClick={handleBarClick}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
