import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { TrendingUp, Layers } from 'lucide-react';

interface ReportDeliveryChartsProps {
  reportData: {
    trendChartData: any[];
    pieChartData: any[];
    deptChartData: any[];
    totalDirtyCollected: number;
  };
  isWardUser: boolean;
  timeUnit?: 'day' | 'month' | 'quarter' | 'year';
}

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'];

export default function ReportDeliveryCharts({ reportData, isWardUser, timeUnit = 'month' }: ReportDeliveryChartsProps) {
  const formatTick = (val: string) => {
    if (!val) return '';
    if (timeUnit === 'day') {
      return val;
    }
    if (val.length > 7) {
      return val.slice(8);
    }
    if (val.length === 7) {
      return `Thg ${val.slice(5)}`;
    }
    return val;
  };
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend line chart */}
        <div className="lg:col-span-2 bg-white border border-black/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" />
              Biểu Đồ Xu Hướng Luân Chuyển Đồ Vải
            </h3>
            <span className="text-[10px] text-stone-400 font-bold font-mono">
              Đơn vị: cái
            </span>
          </div>

          <div className="h-64 w-full">
            {reportData.trendChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-stone-400 italic">
                Chưa có dữ liệu xu hướng trong khoảng thời gian này.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportData.trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="dateLabel" 
                    tickFormatter={formatTick}
                    tick={{ fontSize: 10, fill: '#6B7280' }} 
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="dirty" 
                    name="Đồ dơ thu hồi" 
                    stroke="#F59E0B" 
                    strokeWidth={2.5} 
                    activeDot={{ r: 6 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="clean" 
                    name="Đồ sạch bàn giao" 
                    stroke="#10B981" 
                    strokeWidth={2.5} 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pie distribution chart */}
        <div className="bg-white border border-black/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wider flex items-center gap-2">
            <Layers size={16} className="text-blue-600" />
            Cơ Cấu Đồ Vải Thu Gom
          </h3>

          <div className="h-56 w-full flex items-center justify-center relative">
            {reportData.pieChartData.length === 0 ? (
              <div className="text-xs text-stone-400 italic">
                Chưa có dữ liệu phân loại.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {reportData.pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Visual center label */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <span className="block text-[8px] font-black uppercase text-stone-400">TỔNG DƠ</span>
                  <span className="font-mono font-extrabold text-stone-800 text-sm">
                    {reportData.totalDirtyCollected.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Pie Legends */}
          <div className="grid grid-cols-2 gap-2 text-[10px] text-stone-600 border-t border-stone-100 pt-3">
            {reportData.pieChartData.map((entry, index) => {
              const pct = reportData.totalDirtyCollected > 0 
                ? Math.round((entry.value / reportData.totalDirtyCollected) * 100)
                : 0;
              return (
                <div key={entry.name} className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="truncate" title={entry.name}>{entry.name} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* DEPARTMENT BAR COMPARISON CHART */}
      {!isWardUser && reportData.deptChartData.length > 0 && (
        <div className="bg-white border border-black/10 rounded-2xl p-5 shadow-xs space-y-4 no-print">
          <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wider">
            Top 10 Khoa Phòng Luân Chuyển Đồ Vải Nhiều Nhất
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.deptChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#6B7280' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#6B7280' }} width={120} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="dirty" name="Đồ dơ bàn giao" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="clean" name="Đồ sạch thu nhận" fill="#10B981" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
