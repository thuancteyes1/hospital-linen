import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, Layers } from 'lucide-react';

interface ReportInventoryChartsProps {
  inventoryData: {
    wardInventoryList: any[];
    groupInventoryList: any[];
    filteredTotalStock: number;
  };
  selectedInventoryLoc: string;
  selectedInventoryGroup: string;
}

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'];

export default function ReportInventoryCharts({
  inventoryData,
  selectedInventoryLoc,
  selectedInventoryGroup
}: ReportInventoryChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
      {/* Chart 1: Bar chart comparison of department stocks */}
      <div className="lg:col-span-2 bg-white border border-black/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-xs text-stone-900 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-600" />
            {selectedInventoryGroup === 'all'
              ? "Biểu Đồ Phân Bổ Tồn Kho Đồ Vải Ở Các Khoa Lâm Sàng"
              : `Phân Bổ Tồn Kho Nhóm: ${selectedInventoryGroup}`}
          </h3>
          <span className="text-[9px] text-stone-400 font-bold font-mono">Đơn vị: cái</span>
        </div>

        <div className="h-72 w-full">
          {inventoryData.wardInventoryList.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-stone-400 italic">
              Không có số liệu tồn kho khoa phòng.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventoryData.wardInventoryList} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 9, fill: '#4B5563', fontWeight: 'bold' }} 
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '8px 12px' }} />
                <Bar dataKey="value" name="Số lượng tồn" fill="#8B5CF6" radius={[4, 4, 0, 0]}>
                  {inventoryData.wardInventoryList.map((entry, index) => {
                    const isSelected = selectedInventoryLoc === entry.name;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={isSelected ? '#F59E0B' : COLORS[index % COLORS.length]} 
                        opacity={selectedInventoryLoc === 'all' || isSelected ? 1 : 0.4}
                        stroke={isSelected ? '#D97706' : undefined}
                        strokeWidth={isSelected ? 2 : 0}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 2: Pie chart of linen group structure */}
      <div className="bg-white border border-black/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-xs text-stone-900 uppercase tracking-wider flex items-center gap-2">
            <Layers size={16} className="text-emerald-600" />
            {selectedInventoryGroup === 'all'
              ? `Cơ Cấu Nhóm Đồ Vải ${selectedInventoryLoc === 'all' ? 'Toàn Viện' : (selectedInventoryLoc === 'Kho trung tâm' ? 'Kho Chính' : `Khoa ${selectedInventoryLoc}`)}`
              : `Cơ Cấu Chi Tiết ${selectedInventoryGroup} ${selectedInventoryLoc === 'all' ? 'Toàn Viện' : (selectedInventoryLoc === 'Kho trung tâm' ? 'Kho Chính' : `Khoa ${selectedInventoryLoc}`)}`}
          </h3>
        </div>

        <div className="h-52 w-full flex items-center justify-center relative">
          {inventoryData.groupInventoryList.length === 0 ? (
            <div className="text-xs text-stone-400 italic">Không có dữ liệu cơ cấu.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryData.groupInventoryList}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {inventoryData.groupInventoryList.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toLocaleString()} cái`} contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center text-center px-4 max-w-[110px] overflow-hidden">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider leading-tight">Tổng tồn lọc</span>
                <span className="text-base font-black text-stone-900 leading-tight truncate w-full">{inventoryData.filteredTotalStock.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>

        {/* Legend for Group Inventory */}
        <div className="grid grid-cols-2 gap-2 text-[10px] text-stone-600 border-t border-stone-100 pt-3">
          {inventoryData.groupInventoryList.map((entry, index) => {
            const pct = inventoryData.filteredTotalStock > 0
              ? Math.round((entry.value / inventoryData.filteredTotalStock) * 100)
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
  );
}
