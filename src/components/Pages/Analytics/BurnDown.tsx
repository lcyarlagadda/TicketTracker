// components/Analytics/Burndown.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Calendar, Settings, Plus, Save, RefreshCw, TrendingDown, Target, AlertCircle, CheckCircle, Edit3, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { updateBoard } from '../../../store/slices/boardSlice';
import { Task, Board, BurndownData, SprintConfig, BurndownEntry } from '../../../store/types/types';

// Extended types for burndown management

interface BurndownManagerProps {
  board: Board & { burndownData?: BurndownData };
  tasks: Task[];
}

const Burndown: React.FC<BurndownManagerProps> = ({ board, tasks }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  

  // Sprint configuration state
  const [sprintConfig, setSprintConfig] = useState<SprintConfig>(
    board.burndownData?.sprintConfig || {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalPoints: 0,
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday
      sprintGoal: '',
      velocityTarget: 0
    }
  );

  // Manual entry state
  const [manualEntry, setManualEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    remainingPoints: 0,
    note: ''
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Get task points helper
  const getTaskPoints = (task: Task): number => {
    if ((task as any).points) return (task as any).points;
    return task.priority === 'High' ? 8 : task.priority === 'Medium' ? 5 : 3;
  };

  // Calculate total points from tasks
  useEffect(() => {
    const totalPoints = tasks.reduce((sum, task) => sum + getTaskPoints(task), 0);
    setSprintConfig(prev => ({ ...prev, totalPoints }));
  }, [tasks]);

  // Generate burndown data
  const burndownData = useMemo(() => {
    const { startDate, endDate, totalPoints, workingDays } = sprintConfig;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    
    const data = [];
    const manualEntries = board.burndownData?.entries || [];
    
    // Generate ideal and actual burndown
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const currentDate = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const isWorkingDay = workingDays.includes(dayOfWeek);
      
      // Calculate days elapsed (working days only)
      let workingDaysElapsed = 0;
      for (let d = new Date(start); d <= date; d.setDate(d.getDate() + 1)) {
        if (workingDays.includes(d.getDay())) {
          workingDaysElapsed++;
        }
      }
      
      // Calculate total working days in sprint
      let totalWorkingDays = 0;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (workingDays.includes(d.getDay())) {
          totalWorkingDays++;
        }
      }
      
      // Ideal burndown (linear decrease on working days only)
      const idealRemaining = isWorkingDay && totalWorkingDays > 0 
        ? Math.max(0, totalPoints - (totalPoints * workingDaysElapsed / totalWorkingDays))
        : totalPoints - (totalPoints * workingDaysElapsed / Math.max(totalWorkingDays, 1));
      
      // Check for manual entry
      const manualEntry = manualEntries.find(entry => entry.date === currentDate);
      
      let actualRemaining = idealRemaining;
      let completedPoints = 0;
      
      if (manualEntry) {
        actualRemaining = manualEntry.remainingPoints;
        completedPoints = manualEntry.completedPoints;
      } else if (date <= today) {
        // Calculate from completed tasks
        const completedByDate = tasks.filter(task => {
          if (task.status !== 'Done' && task.status !== 'done') return false;
          
          const completionLog = task.progressLog?.find(log => 
            log.type === 'status-change' && 
            (log.desc.includes('done') || log.desc.includes('Done'))
          );
          
          const completedDate = completionLog?.timestamp?.toDate?.() || task.createdAt?.toDate?.();
          return completedDate && completedDate.toISOString().split('T')[0] <= currentDate;
        });
        
        completedPoints = completedByDate.reduce((sum, task) => sum + getTaskPoints(task), 0);
        actualRemaining = Math.max(0, totalPoints - completedPoints);
      }
      
      data.push({
        date: currentDate,
        dateFormatted: date.toLocaleDateString(),
        dayOfWeek: date.toLocaleDateString('en', { weekday: 'short' }),
        idealRemaining: Math.round(idealRemaining),
        actualRemaining: Math.round(actualRemaining),
        completedPoints: Math.round(completedPoints),
        isToday: currentDate === today.toISOString().split('T')[0],
        isWorkingDay,
        isManual: !!manualEntry,
        note: manualEntry?.note
      });
    }
    
    return data;
  }, [sprintConfig, board.burndownData?.entries, tasks]);

  // Calculate sprint metrics
  const sprintMetrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayData = burndownData.find(d => d.date === today);
    const latestData = burndownData.filter(d => d.date <= today).pop();
    
    const daysRemaining = burndownData.filter(d => 
      d.date > today && d.isWorkingDay
    ).length;
    
    const velocityNeeded = latestData && daysRemaining > 0 
      ? latestData.actualRemaining / daysRemaining 
      : 0;
    
    const currentVelocity = burndownData
      .filter(d => d.date <= today && d.completedPoints > 0)
      .slice(-5) // Last 5 days
      .reduce((sum, d, _, arr) => sum + d.completedPoints, 0) / 5;
    
    const projectedCompletion = currentVelocity > 0 
      ? latestData ? latestData.actualRemaining / currentVelocity : 0 
      : Infinity;
    
    return {
      remainingPoints: latestData?.actualRemaining || sprintConfig.totalPoints,
      completedPoints: latestData?.completedPoints || 0,
      daysRemaining,
      velocityNeeded: Math.round(velocityNeeded * 10) / 10,
      currentVelocity: Math.round(currentVelocity * 10) / 10,
      projectedCompletion: Math.round(projectedCompletion * 10) / 10,
      isOnTrack: velocityNeeded <= currentVelocity * 1.1, // 10% buffer
      completionPercentage: ((latestData?.completedPoints || 0) / sprintConfig.totalPoints * 100).toFixed(1)
    };
  }, [burndownData, sprintConfig.totalPoints]);

  // Save burndown data
  const saveBurndownData = async () => {
    if (!user || !board.id) return;
    
    setSaveStatus('saving');
    try {
      await dispatch(updateBoard({
        userId: user.uid,
        boardId: board.id,
        updates: {
          burndownData: {
            sprintConfig,
            entries: board.burndownData?.entries || [],
            lastUpdated: new Date().toISOString()
          }
        }
      })).unwrap();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      console.error('Error saving burndown data:', error);
    }
  };

  // Add manual entry
  const addManualEntry = async () => {
    if (!user || !board.id) return;
    
    const newEntry: BurndownEntry = {
      date: manualEntry.date,
      remainingPoints: manualEntry.remainingPoints,
      completedPoints: sprintConfig.totalPoints - manualEntry.remainingPoints,
      note: manualEntry.note,
      isManual: true,
      updatedBy: user.displayName || user.email
    };
    
    const existingEntries = board.burndownData?.entries || [];
    const updatedEntries = existingEntries.filter(e => e.date !== newEntry.date);
    updatedEntries.push(newEntry);
    
    try {
      await dispatch(updateBoard({
        userId: user.uid,
        boardId: board.id,
        updates: {
          burndownData: {
            sprintConfig,
            entries: updatedEntries.sort((a, b) => a.date.localeCompare(b.date)),
            lastUpdated: new Date().toISOString()
          }
        }
      })).unwrap();
      
      setManualEntry({
        date: new Date().toISOString().split('T')[0],
        remainingPoints: 0,
        note: ''
      });
    } catch (error) {
      console.error('Error adding manual entry:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Burndown Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Burndown Chart</h3>
        
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={burndownData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="dateFormatted" 
                stroke="#64748b" 
                fontSize={11}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value, name, props) => [
                  `${value} points`,
                  name === 'idealRemaining' ? 'Ideal Remaining' : 
                  name === 'actualRemaining' ? 'Actual Remaining' : 'Velocity Target'
                ]}
                labelFormatter={(label, props) => {
                  const data = props?.[0]?.payload;
                  return (
                    <div>
                      <div>{label} ({data?.dayOfWeek})</div>
                      {data?.isManual && <div className="text-xs text-blue-600">Manual Entry</div>}
                      {data?.note && <div className="text-xs text-slate-500">{data.note}</div>}
                    </div>
                  );
                }}
              />
              
              {/* Ideal burndown line */}
              <Line 
                type="monotone" 
                dataKey="idealRemaining" 
                stroke="#94a3b8" 
                strokeWidth={2} 
                strokeDasharray="5 5" 
                name="idealRemaining"
                dot={false}
              />
              
              {/* Actual burndown line */}
              <Line 
                type="monotone" 
                dataKey="actualRemaining" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                name="actualRemaining"
                dot={(props) => {
                  const { payload } = props;
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={payload?.isManual ? 6 : 4}
                      fill={payload?.isManual ? "#f59e0b" : "#3b82f6"}
                      stroke={payload?.isManual ? "#d97706" : "#1e40af"}
                      strokeWidth={2}
                    />
                  );
                }}
              />
              
              {/* Velocity target reference line */}
              {sprintConfig.velocityTarget > 0 && (
                <ReferenceLine 
                  y={sprintConfig.velocityTarget} 
                  stroke="#10b981" 
                  strokeDasharray="3 3"
                  label="Velocity Target"
                />
              )}
              
              {/* Today marker */}
              <ReferenceLine 
                x={burndownData.find(d => d.isToday)?.dateFormatted} 
                stroke="#ef4444" 
                strokeWidth={2}
                label="Today"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-slate-400" style={{ borderTop: '2px dashed' }}></div>
            <span>Ideal Burndown</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-600"></div>
            <span>Actual Burndown</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-yellow-600"></div>
            <span>Manual Entry</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500"></div>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus !== 'idle' && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
          saveStatus === 'saving' ? 'bg-blue-600 text-white' :
          saveStatus === 'saved' ? 'bg-green-600 text-white' :
          'bg-red-600 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && <RefreshCw size={16} className="animate-spin" />}
            {saveStatus === 'saved' && <CheckCircle size={16} />}
            {saveStatus === 'error' && <AlertCircle size={16} />}
            <span>
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && 'Saved successfully'}
              {saveStatus === 'error' && 'Error saving data'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Burndown;