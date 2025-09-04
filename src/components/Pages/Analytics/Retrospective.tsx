// components/Analytics/RetrospectiveTab.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, Trash2, Users, Calendar, CheckCircle, AlertCircle, Target, ThumbsUp, ThumbsDown, Settings } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { updateBoard } from '../../../store/slices/boardSlice';
import { Task, Board, Collaborator, NewItemForm, RetroItem, RetroData } from '../../../store/types/types';

interface RetrospectiveTabProps {
  board: Board & { retroData?: RetroData };
  tasks: Task[];
}

const RetrospectiveTab: React.FC<RetrospectiveTabProps> = ({ board, tasks }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  
  const [retroItems, setRetroItems] = useState<RetroItem[]>(board.retroData?.items || []);
  const [newItem, setNewItem] = useState<NewItemForm>({ 
    type: 'went-well', 
    content: '', 
    assignedTo: '', 
    dueDate: '',
    priority: 'Medium'
  });
  const [showAddForm, setShowAddForm] = useState<{[key: string]: boolean}>({ 
    'went-well': false, 
    'improve': false, 
    'action': false 
  });
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error'>('saved');

  // Auto-save retro data
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
            sprintName: board.retroData?.sprintName || `Sprint ${new Date().getMonth() + 1}`,
            facilitator: board.retroData?.facilitator || user.displayName || user.email || 'Anonymous'
          }
        }
      })).unwrap();
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error saving retro data:', error);
      setSaveStatus('error');
    }
  };

  useEffect(() => {
    if (retroItems.length > 0) {
      const timeoutId = setTimeout(saveRetroData, 1000);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [retroItems]);

  // Sprint summary
  const sprintSummary = useMemo(() => {
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
      velocity: completedPoints,
      teamSize: board.collaborators.length
    };
  }, [tasks, board.collaborators]);

  const handleAddItem = (type: 'went-well' | 'improve' | 'action'): void => {
    if (!newItem.content.trim()) return;

    const item: RetroItem = {
      id: Date.now(),
      type,
      content: newItem.content.trim(),
      author: user?.displayName || user?.email || 'Current User',
      createdAt: new Date().toISOString(),
      votes: 0,
      assignedTo: type === 'action' ? newItem.assignedTo : undefined,
      dueDate: type === 'action' ? newItem.dueDate : undefined,
      priority: type === 'action' ? newItem.priority : 'Medium',
      tags: []
    };

    setRetroItems([...retroItems, item]);
    setNewItem({ type: 'went-well', content: '', assignedTo: '', dueDate: '', priority: 'Medium' });
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

  const getItemsByType = (type: 'went-well' | 'improve' | 'action'): RetroItem[] => 
    retroItems.filter(item => item.type === type).sort((a, b) => (b.votes || 0) - (a.votes || 0));

  const columnConfig = {
    'went-well': {
      title: "What Went Well",
      description: "Celebrate successes and positive outcomes",
      color: "green",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-800",
      buttonColor: "bg-green-600 hover:bg-green-700",
      icon: ThumbsUp
    },
    'improve': {
      title: "What Didn't Go Well",
      description: "Identify challenges and areas for improvement",
      color: "red", 
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-800",
      buttonColor: "bg-red-600 hover:bg-red-700",
      icon: ThumbsDown
    },
    'action': {
      title: "Actionable Items",
      description: "Concrete actions to improve next sprint",
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
      {/* Sprint Summary Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Sprint Retrospective</h2>
            <p className="text-slate-600 mt-1">Reflect on what happened and plan improvements for the next sprint</p>
            <div className="mt-2 text-sm text-slate-500">
              Facilitator: {board.retroData?.facilitator || user?.displayName || 'You'} • 
              Last updated: {board.retroData?.lastUpdated ? new Date(board.retroData.lastUpdated).toLocaleDateString() : 'Never'}
            </div>
          </div>
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

        {/* Sprint Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center bg-slate-50 rounded-lg p-3">
            <div className="text-xl font-bold text-slate-800">{sprintSummary.totalTasks}</div>
            <div className="text-sm text-slate-600">Total Tasks</div>
          </div>
          <div className="text-center bg-green-50 rounded-lg p-3">
            <div className="text-xl font-bold text-green-600">{sprintSummary.completedTasks}</div>
            <div className="text-sm text-slate-600">Completed</div>
          </div>
          <div className="text-center bg-blue-50 rounded-lg p-3">
            <div className="text-xl font-bold text-blue-600">{sprintSummary.velocity}</div>
            <div className="text-sm text-slate-600">Story Points</div>
          </div>
          <div className="text-center bg-red-50 rounded-lg p-3">
            <div className="text-xl font-bold text-purple-600">{sprintSummary.completionRate}%</div>
            <div className="text-sm text-slate-600">Completion</div>
          </div>
          <div className="text-center bg-orange-50 rounded-lg p-3">
            <div className="text-xl font-bold text-orange-600">{sprintSummary.teamSize}</div>
            <div className="text-sm text-slate-600">Team Size</div>
          </div>
        </div>
      </div>

      {/* Retrospective Guidelines */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
        <div className="flex items-start gap-4">
          <Settings size={24} className="text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-slate-800 mb-2">Retrospective Guidelines</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-700">
              <div>
                <strong className="text-green-700">What Went Well:</strong>
                <p>Focus on achievements, successful processes, and positive team dynamics.</p>
              </div>
              <div>
                <strong className="text-red-700">What Didn't Go Well:</strong>
                <p>Identify bottlenecks, process issues, and areas where we struggled.</p>
              </div>
              <div>
                <strong className="text-blue-700">Action Items:</strong>
                <p>Create specific, measurable actions to address identified issues.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Retrospective Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(Object.entries(columnConfig) as Array<[keyof typeof columnConfig, typeof columnConfig[keyof typeof columnConfig]]>).map(([type, config]) => {
          const IconComponent = config.icon;
          const items = getItemsByType(type);
          
          return (
            <div key={type} className={`${config.bgColor} rounded-xl ${config.borderColor} border-2 p-4 min-h-[500px]`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <IconComponent size={20} className={config.textColor} />
                    <h3 className={`font-semibold ${config.textColor}`}>{config.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full bg-white ${config.textColor} font-medium`}>
                      {items.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{config.description}</p>
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
                    placeholder={`What ${type === 'went-well' ? 'went well' : type === 'improve' ? 'could be improved' : 'action should we take'}?`}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                    rows={3}
                  />
                  
                  {type === 'action' && (
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={newItem.assignedTo}
                          onChange={(e) => setNewItem({ ...newItem, assignedTo: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                        >
                          <option value="">Assign to...</option>
                          {board.collaborators.map((collab: Collaborator) => (
                            <option key={collab.email} value={collab.name}>{collab.name}</option>
                          ))}
                        </select>
                        <select
                          value={newItem.priority}
                          onChange={(e) => setNewItem({ ...newItem, priority: e.target.value as 'Low' | 'Medium' | 'High' })}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                        >
                          <option value="Low">Low Priority</option>
                          <option value="Medium">Medium Priority</option>
                          <option value="High">High Priority</option>
                        </select>
                      </div>
                      <input
                        type="date"
                        value={newItem.dueDate}
                        onChange={(e) => setNewItem({ ...newItem, dueDate: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleAddItem(type)}
                      className={`flex-1 ${config.buttonColor} text-white py-2 px-4 rounded-lg font-medium transition-colors text-sm`}
                    >
                      Add Item
                    </button>
                    <button
                      onClick={() => setShowAddForm({ ...showAddForm, [type]: false })}
                      className="flex-1 bg-slate-300 text-slate-700 py-2 px-4 rounded-lg font-medium hover:bg-slate-400 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                    <p className="text-slate-800 mb-3 leading-relaxed">{item.content}</p>
                    
                    {item.type === 'action' && (
                      <div className="mb-3 space-y-1">
                        {item.assignedTo && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Users size={14} />
                            <span>Assigned to: <strong>{item.assignedTo}</strong></span>
                          </div>
                        )}
                        {item.dueDate && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar size={14} />
                            <span>Due: <strong>{new Date(item.dueDate).toLocaleDateString()}</strong></span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.priority === 'High' ? 'bg-red-100 text-red-700' :
                            item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {item.priority} Priority
                          </span>
                        </div>
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
                        <span className="text-xs text-slate-500">
                          by {item.author} • {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {items.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <IconComponent size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium">No items yet</p>
                    <p className="text-xs text-slate-400">Click "Add" to contribute your thoughts</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Items Summary */}
      {getItemsByType('action').length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Action Items Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 rounded-lg border border-red-200 p-4">
              <h4 className="font-medium text-red-800 mb-2">High Priority</h4>
              <div className="text-2xl font-bold text-red-900">
                {getItemsByType('action').filter(item => item.priority === 'High').length}
              </div>
              <div className="text-sm text-red-600">Urgent actions needed</div>
            </div>
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Medium Priority</h4>
              <div className="text-2xl font-bold text-yellow-900">
                {getItemsByType('action').filter(item => item.priority === 'Medium').length}
              </div>
              <div className="text-sm text-yellow-600">Important improvements</div>
            </div>
            <div className="bg-green-50 rounded-lg border border-green-200 p-4">
              <h4 className="font-medium text-green-800 mb-2">Low Priority</h4>
              <div className="text-2xl font-bold text-green-900">
                {getItemsByType('action').filter(item => item.priority === 'Low').length}
              </div>
              <div className="text-sm text-green-600">Nice to have</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetrospectiveTab;