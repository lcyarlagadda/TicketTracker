// components/Analytics/RetrospectiveBoard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, Edit3, Trash2, Users, Calendar, CheckCircle, AlertCircle, Target } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { updateBoard } from '../../store/slices/boardSlice';
import { Task, Board, Collaborator } from '../../store/types/types';

// Extended types for retrospective data
interface RetroItem {
  id: number;
  type: 'good' | 'improve' | 'action';
  content: string;
  author: string;
  createdAt: string;
  votes: number;
  assignedTo?: string;
  dueDate?: string;
}

interface RetroData {
  items: RetroItem[];
  lastUpdated: string;
  sprint: string;
}

interface RetrospectiveBoardProps {
  board: Board & { retroData?: RetroData };
  tasks: Task[];
}

interface NewItemForm {
  type: 'good' | 'improve' | 'action';
  content: string;
  assignedTo: string;
  dueDate: string;
}

interface ShowAddForm {
  good: boolean;
  improve: boolean;
  action: boolean;
}

const RetrospectiveBoard: React.FC<RetrospectiveBoardProps> = ({ board, tasks }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  
  // Get retro data from board metadata or initialize
  const [retroItems, setRetroItems] = useState<RetroItem[]>(board.retroData?.items || []);
  const [newItem, setNewItem] = useState<NewItemForm>({ 
    type: 'good', 
    content: '', 
    assignedTo: '', 
    dueDate: '' 
  });
  const [showAddForm, setShowAddForm] = useState<ShowAddForm>({ 
    good: false, 
    improve: false, 
    action: false 
  });
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error'>('saved');

  // Auto-save retro data to board
  const saveRetroData = async (): Promise<void> => {
    if (!user || !board.id) return;
    
    setSaveStatus('saving');
    try {
      await dispatch(updateBoard({
        userId: user.uid,
        boardId: board.id,
        updates: {
          retroData: {
            items: retroItems,
            lastUpdated: new Date().toISOString(),
            sprint: board.retroData?.sprint || `Sprint ${new Date().getMonth() + 1}`
          }
        }
      })).unwrap();
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error saving retro data:', error);
      setSaveStatus('error');
    }
  };

  // Save retro data when items change
  useEffect(() => {
    if (retroItems.length > 0) {
      const timeoutId = setTimeout(saveRetroData, 1000); // Auto-save after 1 second of inactivity
      return () => clearTimeout(timeoutId);
    }
    return undefined
  }, [retroItems]);

  const handleAddItem = (type: 'good' | 'improve' | 'action'): void => {
    if (!newItem.content.trim()) return;

    const item: RetroItem = {
      id: Date.now(),
      type,
      content: newItem.content.trim(),
      author: user?.displayName || user?.email || 'Current User',
      createdAt: new Date().toISOString(),
      votes: 0,
      assignedTo: type === 'action' ? newItem.assignedTo : undefined,
      dueDate: type === 'action' ? newItem.dueDate : undefined
    };

    setRetroItems([...retroItems, item]);
    setNewItem({ type: 'good', content: '', assignedTo: '', dueDate: '' });
    setShowAddForm({ ...showAddForm, [type]: false });
  };

  const handleVote = (itemId: number): void => {
    setRetroItems(retroItems.map(item =>
      item.id === itemId ? { ...item, votes: (item.votes || 0) + 1 } : item
    ));
  };

  const handleDeleteItem = (itemId: number): void => {
    setRetroItems(retroItems.filter(item => item.id !== itemId));
  };

  const handleEditItem = (itemId: number, updates: Partial<RetroItem>): void => {
    setRetroItems(retroItems.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    ));
    setEditingItem(null);
  };

  const getItemsByType = (type: 'good' | 'improve' | 'action'): RetroItem[] => 
    retroItems.filter(item => item.type === type);

  // Calculate sprint metrics
  const sprintMetrics = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Done' || t.status === 'done').length;
    
    const getTaskPoints = (task: Task): number => {
      if ((task as any).points) return (task as any).points;
      return task.priority === 'High' ? 8 : task.priority === 'Medium' ? 5 : 3;
    };
    
    const totalPoints = tasks.reduce((sum, t) => sum + getTaskPoints(t), 0);
    const completedPoints = tasks
      .filter(t => t.status === 'Done' || t.status === 'done')
      .reduce((sum, t) => sum + getTaskPoints(t), 0);
    
    return {
      totalTasks,
      completedTasks,
      totalPoints,
      completedPoints,
      completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : '0',
      velocity: completedPoints
    };
  }, [tasks]);

  const columnConfig = {
    good: {
      title: "What Went Well",
      color: "green",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-800",
      buttonColor: "bg-green-600 hover:bg-green-700",
      icon: CheckCircle
    },
    improve: {
      title: "What Could Be Improved",
      color: "orange", 
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      textColor: "text-orange-800",
      buttonColor: "bg-orange-600 hover:bg-orange-700",
      icon: AlertCircle
    },
    action: {
      title: "Action Items",
      color: "blue",
      bgColor: "bg-blue-50", 
      borderColor: "border-blue-200",
      textColor: "text-blue-800",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
      icon: Target
    }
  } as const;

  return (
    <div className="space-y-6">
      {/* Sprint Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Sprint Summary</h3>
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              saveStatus === 'saving' ? 'bg-yellow-500 animate-pulse' :
              saveStatus === 'saved' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-slate-600">
              {saveStatus === 'saving' ? 'Saving...' :
               saveStatus === 'saved' ? 'Saved' : 'Error saving'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-800">{sprintMetrics.totalTasks}</div>
            <div className="text-sm text-slate-600">Total Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{sprintMetrics.completedTasks}</div>
            <div className="text-sm text-slate-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{sprintMetrics.velocity}</div>
            <div className="text-sm text-slate-600">Velocity (Points)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{sprintMetrics.completionRate}%</div>
            <div className="text-sm text-slate-600">Completion Rate</div>
          </div>
        </div>
      </div>

      {/* Retrospective Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(Object.entries(columnConfig) as Array<[keyof typeof columnConfig, typeof columnConfig[keyof typeof columnConfig]]>).map(([type, config]) => {
          const IconComponent = config.icon;
          return (
            <div key={type} className={`${config.bgColor} rounded-xl ${config.borderColor} border-2 p-4`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <IconComponent size={20} className={config.textColor} />
                  <h3 className={`font-semibold ${config.textColor}`}>{config.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full bg-white ${config.textColor}`}>
                    {getItemsByType(type).length}
                  </span>
                </div>
                <button
                  onClick={() => setShowAddForm({ ...showAddForm, [type]: !showAddForm[type] })}
                  className={`p-2 rounded-lg ${config.buttonColor} text-white transition-colors`}
                >
                  {showAddForm[type] ? <X size={16} /> : <Plus size={16} />}
                </button>
              </div>

              {/* Add Item Form */}
              {showAddForm[type] && (
                <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
                  <textarea
                    value={newItem.content}
                    onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                    placeholder={`Add a ${type === 'good' ? 'positive note' : type === 'improve' ? 'improvement suggestion' : 'action item'}...`}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                    rows={3}
                  />
                  
                  {type === 'action' && (
                    <div className="mt-3 space-y-2">
                      <select
                        value={newItem.assignedTo}
                        onChange={(e) => setNewItem({ ...newItem, assignedTo: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Assign to...</option>
                        {board.collaborators.map((collab: Collaborator) => (
                          <option key={collab.email} value={collab.name}>{collab.name}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={newItem.dueDate}
                        onChange={(e) => setNewItem({ ...newItem, dueDate: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleAddItem(type)}
                      className={`flex-1 ${config.buttonColor} text-white py-2 px-4 rounded-lg font-medium transition-colors`}
                    >
                      Add Item
                    </button>
                    <button
                      onClick={() => setShowAddForm({ ...showAddForm, [type]: false })}
                      className="flex-1 bg-slate-300 text-slate-700 py-2 px-4 rounded-lg font-medium hover:bg-slate-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                {getItemsByType(type).sort((a, b) => (b.votes || 0) - (a.votes || 0)).map(item => (
                  <div key={item.id} className="bg-white rounded-lg border border-slate-200 p-4">
                    {editingItem === item.id ? (
                      <div className="space-y-3">
                        <textarea
                          defaultValue={item.content}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                          rows={2}
                          onBlur={(e) => handleEditItem(item.id, { content: e.target.value })}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingItem(null)}
                            className="text-sm bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition-colors"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-slate-800 mb-3">{item.content}</p>
                        
                        {item.type === 'action' && (
                          <div className="mb-3 space-y-1">
                            {item.assignedTo && (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Users size={14} />
                                <span>Assigned to: {item.assignedTo}</span>
                              </div>
                            )}
                            {item.dueDate && (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Calendar size={14} />
                                <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleVote(item.id)}
                              className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                              <span className="text-sm">👍</span>
                              <span className="text-sm font-medium">{item.votes || 0}</span>
                            </button>
                            <span className="text-xs text-slate-500">by {item.author}</span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingItem(item.id)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                
                {getItemsByType(type).length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <IconComponent size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">No items yet</p>
                    <p className="text-xs text-slate-400">Add your first {type} item</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RetrospectiveBoard;