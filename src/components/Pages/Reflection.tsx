// components/Analytics/ReflectionPage.tsx - Fixed version
import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Lightbulb, Target, Plus, X, Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { updateBoard } from '../../store/slices/boardSlice';
import { Task, Board, ReflectionData, ReflectionItem } from '../../store/types/types';

interface ReflectionPageProps {
  board: Board;
  tasks: Task[];
}

interface NewReflectionForm {
  content: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
}

type TabKey = 'personal' | 'team' | 'lessons' | 'goals';

interface TabConfig {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}

const ReflectionPage: React.FC<ReflectionPageProps> = ({ board, tasks }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  
  const [reflectionData, setReflectionData] = useState<ReflectionData>(board.reflectionData || {
    personalReflections: [],
    teamInsights: [],
    lessonsLearned: [],
    futureGoals: [],
    lastUpdated: null
  });
  
  const [activeTab, setActiveTab] = useState<TabKey>('personal');
  const [newReflection, setNewReflection] = useState<NewReflectionForm>({ 
    content: '', 
    category: '', 
    priority: 'Medium' 
  });
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  const saveReflectionData = async (): Promise<void> => {
    if (!user || !board.id) return;
    
    try {
      await dispatch(updateBoard({
        userId: user.uid,
        boardId: board.id,
        updates: {
          reflectionData: {
            ...reflectionData,
            lastUpdated: new Date().toISOString()
          }
        } as Partial<Board> // Type assertion to handle the reflectionData property
      })).unwrap();
    } catch (error) {
      console.error('Error saving reflection data:', error);
    }
  };

  // Fixed useEffect to always return a cleanup function or undefined
  useEffect(() => {
    if (Object.values(reflectionData).some(arr => Array.isArray(arr) && arr.length > 0)) {
      const timeoutId = setTimeout(saveReflectionData, 1000);
      return () => clearTimeout(timeoutId);
    }
    // Explicitly return undefined when condition is not met
    return undefined;
  }, [reflectionData, user, board.id]); // Added dependencies

  const handleAddReflection = (): void => {
    if (!newReflection.content.trim()) return;

    const reflection: ReflectionItem = {
      id: Date.now(),
      content: newReflection.content.trim(),
      category: newReflection.category,
      priority: newReflection.priority,
      author: user?.displayName || user?.email || 'Current User',
      createdAt: new Date().toISOString(),
      tags: []
    };

    const category = activeTab === 'personal' ? 'personalReflections' :
                   activeTab === 'team' ? 'teamInsights' :
                   activeTab === 'lessons' ? 'lessonsLearned' : 'futureGoals';

    setReflectionData({
      ...reflectionData,
      [category]: [...(reflectionData[category] || []), reflection]
    });

    setNewReflection({ content: '', category: '', priority: 'Medium' });
    setShowAddForm(false);
  };

  const handleDeleteReflection = (category: keyof Omit<ReflectionData, 'lastUpdated'>, id: number): void => {
    setReflectionData({
      ...reflectionData,
      [category]: (reflectionData[category] as ReflectionItem[]).filter(item => item.id !== id)
    });
  };

  const tabs: TabConfig[] = [
    { key: 'personal', label: 'Personal Growth', icon: BookOpen, color: 'blue' },
    { key: 'team', label: 'Team Insights', icon: Users, color: 'green' },
    { key: 'lessons', label: 'Lessons Learned', icon: Lightbulb, color: 'yellow' },
    { key: 'goals', label: 'Future Goals', icon: Target, color: 'red' }
  ];

  const getCurrentCategoryData = (): ReflectionItem[] => {
    switch(activeTab) {
      case 'personal': return reflectionData.personalReflections || [];
      case 'team': return reflectionData.teamInsights || [];
      case 'lessons': return reflectionData.lessonsLearned || [];
      case 'goals': return reflectionData.futureGoals || [];
      default: return [];
    }
  };

  const getCurrentCategoryKey = (): keyof Omit<ReflectionData, 'lastUpdated'> => {
    switch(activeTab) {
      case 'personal': return 'personalReflections';
      case 'team': return 'teamInsights';
      case 'lessons': return 'lessonsLearned';
      case 'goals': return 'futureGoals';
      default: return 'personalReflections';
    }
  };

  const getColorClasses = (color: string, isActive: boolean): string => {
    if (isActive) {
      switch(color) {
        case 'blue': return 'bg-blue-600 text-white shadow-lg';
        case 'green': return 'bg-green-600 text-white shadow-lg';
        case 'yellow': return 'bg-yellow-600 text-white shadow-lg';
        case 'red': return 'bg-orange-600 text-white shadow-lg';
        default: return 'bg-blue-600 text-white shadow-lg';
      }
    }
    return 'text-slate-600 hover:bg-slate-100';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen size={24} className="text-blue-600" />
          <h2 className="text-2xl font-bold text-slate-800">Sprint Reflection</h2>
        </div>
        <p className="text-slate-600">
          Take time to reflect on your experiences, learnings, and growth during this sprint.
          Document insights that will help you and your team improve in future iterations.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-slate-800">{tasks.length}</div>
            <div className="text-sm text-slate-600">Tasks Worked On</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {tasks.filter(t => t.status === 'Done' || t.status === 'done').length}
            </div>
            <div className="text-sm text-slate-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{board.collaborators.length}</div>
            <div className="text-sm text-slate-600">Team Members</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">
              {Object.values(reflectionData).reduce((sum, arr) => 
                sum + (Array.isArray(arr) ? arr.length : 0), 0)}
            </div>
            <div className="text-sm text-slate-600">Reflections</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-1">
        <div className="flex space-x-1">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  getColorClasses(tab.color, isActive)
                }`}
              >
                <IconComponent size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-slate-800">
            {tabs.find(t => t.key === activeTab)?.label}
          </h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showAddForm ? <X size={16} /> : <Plus size={16} />}
            {showAddForm ? 'Cancel' : 'Add Reflection'}
          </button>
        </div>

        {/* Add Reflection Form */}
        {showAddForm && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-6">
            <textarea
              value={newReflection.content}
              onChange={(e) => setNewReflection({ ...newReflection, content: e.target.value })}
              placeholder={`Share your thoughts about ${tabs.find(t => t.key === activeTab)?.label.toLowerCase()}...`}
              className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              rows={4}
            />
            <div className="flex gap-3 mt-3">
              <select
                value={newReflection.priority}
                onChange={(e) => setNewReflection({ 
                  ...newReflection, 
                  priority: e.target.value as 'Low' | 'Medium' | 'High'
                })}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
              </select>
              <button
                onClick={handleAddReflection}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Reflection
              </button>
            </div>
          </div>
        )}

        {/* Reflections List */}
        <div className="space-y-4">
          {getCurrentCategoryData().length > 0 ? (
            getCurrentCategoryData().map(reflection => (
              <div key={reflection.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      reflection.priority === 'High' ? 'bg-red-100 text-red-700' :
                      reflection.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {reflection.priority} Priority
                    </span>
                    <span className="text-xs text-slate-500">
                      by {reflection.author} • {new Date(reflection.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteReflection(getCurrentCategoryKey(), reflection.id)}
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-slate-700 leading-relaxed">{reflection.content}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500">
              <BookOpen size={48} className="mx-auto mb-4 text-slate-300" />
              <h4 className="text-lg font-medium mb-2">No reflections yet</h4>
              <p className="text-sm text-slate-400 mb-4">
                Start documenting your thoughts and insights about {tabs.find(t => t.key === activeTab)?.label.toLowerCase()}
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Your First Reflection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReflectionPage;