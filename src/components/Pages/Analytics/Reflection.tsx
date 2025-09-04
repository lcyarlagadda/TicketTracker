// components/Analytics/ReflectionTab.tsx
import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Lightbulb, Target, Plus, X, Trash2, User, Crown, Star, TrendingUp } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { updateBoard } from '../../../store/slices/boardSlice';
import { Task, Board, ReflectionData, TabKey, NewReflectionForm, ReflectionItem, TabConfig } from '../../../store/types/types';


interface ReflectionTabProps {
  board: Board & { reflectionData?: ReflectionData };
  tasks: Task[];
}

const ReflectionTab: React.FC<ReflectionTabProps> = ({ board, tasks }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  
  const [reflectionData, setReflectionData] = useState<ReflectionData>(board.reflectionData || {
    personalGrowth: [],
    teamInsights: [],
    lessonsLearned: [],
    futureGoals: [],
    lastUpdated: null
  });
  
  const [activeTab, setActiveTab] = useState<TabKey>('personal');
  const [newReflection, setNewReflection] = useState<NewReflectionForm>({ 
    content: '', 
    category: '', 
    priority: 'Medium',
    reviewType: 'self',
    rating: 3
  });
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'self' | 'manager'>('all');

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
        } as Partial<Board>
      })).unwrap();
    } catch (error) {
      console.error('Error saving reflection data:', error);
    }
  };

  useEffect(() => {
    if (Object.values(reflectionData).some(arr => Array.isArray(arr) && arr.length > 0)) {
      const timeoutId = setTimeout(saveReflectionData, 1000);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [reflectionData, user, board.id]);

  const handleAddReflection = (): void => {
    if (!newReflection.content.trim()) return;

    const reflection: ReflectionItem = {
      id: Date.now(),
      content: newReflection.content.trim(),
      category: newReflection.category,
      priority: newReflection.priority,
      author: user?.displayName || user?.email || 'Current User',
      createdAt: new Date().toISOString(),
      tags: [],
      reviewType: newReflection.reviewType,
      rating: newReflection.rating
    };

    const category = activeTab === 'personal' ? 'personalGrowth' :
                   activeTab === 'team' ? 'teamInsights' :
                   activeTab === 'lessons' ? 'lessonsLearned' : 'futureGoals';

    setReflectionData({
      ...reflectionData,
      [category]: [...(reflectionData[category] || []), reflection]
    });

    setNewReflection({ 
      content: '', 
      category: '', 
      priority: 'Medium',
      reviewType: 'self',
      rating: 3
    });
    setShowAddForm(false);
  };

  const handleDeleteReflection = (category: keyof Omit<ReflectionData, 'lastUpdated'>, id: number): void => {
    setReflectionData({
      ...reflectionData,
      [category]: (reflectionData[category] as ReflectionItem[]).filter(item => item.id !== id)
    });
  };

  const tabs: TabConfig[] = [
    { 
      key: 'personal', 
      label: 'Personal Growth', 
      icon: User, 
      color: 'blue',
      description: 'Your individual development, skills gained, and personal achievements'
    },
    { 
      key: 'team', 
      label: 'Team Insights', 
      icon: Users, 
      color: 'green',
      description: 'Observations about team dynamics, collaboration, and collective achievements'
    },
    { 
      key: 'lessons', 
      label: 'Lessons Learned', 
      icon: Lightbulb, 
      color: 'yellow',
      description: 'Key takeaways, insights, and knowledge gained from experiences'
    },
    { 
      key: 'goals', 
      label: 'Future Goals', 
      icon: Target, 
      color: 'purple',
      description: 'Objectives, aspirations, and plans for upcoming sprints and beyond'
    }
  ];

  const getCurrentCategoryData = (): ReflectionItem[] => {
    const data = (() => {
      switch(activeTab) {
        case 'personal': return reflectionData.personalGrowth || [];
        case 'team': return reflectionData.teamInsights || [];
        case 'lessons': return reflectionData.lessonsLearned || [];
        case 'goals': return reflectionData.futureGoals || [];
        default: return [];
      }
    })();

    // Filter by review type
    if (reviewFilter === 'all') return data;
    return data.filter(item => item.reviewType === reviewFilter);
  };

  const getCurrentCategoryKey = (): keyof Omit<ReflectionData, 'lastUpdated'> => {
    switch(activeTab) {
      case 'personal': return 'personalGrowth';
      case 'team': return 'teamInsights';
      case 'lessons': return 'lessonsLearned';
      case 'goals': return 'futureGoals';
      default: return 'personalGrowth';
    }
  };

  const getColorClasses = (color: string, isActive: boolean): string => {
    if (isActive) {
      switch(color) {
        case 'blue': return 'bg-blue-600 text-white shadow-lg';
        case 'green': return 'bg-green-600 text-white shadow-lg';
        case 'yellow': return 'bg-yellow-600 text-white shadow-lg';
        case 'purple': return 'bg-red-50 text-white shadow-lg';
        default: return 'bg-blue-600 text-white shadow-lg';
      }
    }
    return 'text-slate-600 hover:bg-slate-100';
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        size={16} 
        className={i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'} 
      />
    ));
  };

  // Calculate summary statistics
  const summaryStats = {
    totalReflections: Object.values(reflectionData).reduce((sum, arr) => 
      sum + (Array.isArray(arr) ? arr.length : 0), 0),
    selfReviews: Object.values(reflectionData).reduce((sum, arr) => 
      sum + (Array.isArray(arr) ? arr.filter(item => item.reviewType === 'self').length : 0), 0),
    managerReviews: Object.values(reflectionData).reduce((sum, arr) => 
      sum + (Array.isArray(arr) ? arr.filter(item => item.reviewType === 'manager').length : 0), 0),
    avgRating: (() => {
      const allItems: ReflectionItem[] = [
        ...(reflectionData.personalGrowth || []),
        ...(reflectionData.teamInsights || []),
        ...(reflectionData.lessonsLearned || []),
        ...(reflectionData.futureGoals || [])
      ];
      const ratedItems = allItems.filter(item => item.rating);
      return ratedItems.length > 0 
        ? (ratedItems.reduce((sum, item) => sum + (item.rating || 0), 0) / ratedItems.length).toFixed(1)
        : '0';
    })()
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen size={24} className="text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Sprint Reflection</h2>
            <p className="text-slate-600">
              Comprehensive self and manager review covering personal growth, team insights, and future planning
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{summaryStats.totalReflections}</div>
            <div className="text-sm text-blue-700">Total Reflections</div>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{summaryStats.selfReviews}</div>
            <div className="text-sm text-green-700">Self Reviews</div>
          </div>
          <div className="bg-red-50 rounded-lg border border-purple-200 p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{summaryStats.managerReviews}</div>
            <div className="text-sm text-purple-700">Manager Reviews</div>
          </div>
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              {renderStars(Math.round(parseFloat(summaryStats.avgRating)))}
            </div>
            <div className="text-sm text-yellow-700">Avg Rating: {summaryStats.avgRating}</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-1">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-1">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              {tabs.find(t => t.key === activeTab)?.label}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {tabs.find(t => t.key === activeTab)?.description}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={reviewFilter}
              onChange={(e) => setReviewFilter(e.target.value as 'all' | 'self' | 'manager')}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">All Reviews</option>
              <option value="self">Self Reviews</option>
              <option value="manager">Manager Reviews</option>
            </select>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showAddForm ? <X size={16} /> : <Plus size={16} />}
              {showAddForm ? 'Cancel' : 'Add Reflection'}
            </button>
          </div>
        </div>

        {/* Add Reflection Form */}
        {showAddForm && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 mb-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Review Type</label>
                  <select
                    value={newReflection.reviewType}
                    onChange={(e) => setNewReflection({ 
                      ...newReflection, 
                      reviewType: e.target.value as 'self' | 'manager' 
                    })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="self">Self Review</option>
                    <option value="manager">Manager Review</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                  <select
                    value={newReflection.priority}
                    onChange={(e) => setNewReflection({ 
                      ...newReflection, 
                      priority: e.target.value as 'Low' | 'Medium' | 'High'
                    })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Rating (1-5 stars)</label>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setNewReflection({ ...newReflection, rating: i + 1 })}
                      className="focus:outline-none"
                    >
                      <Star 
                        size={24} 
                        className={i < newReflection.rating ? 'text-yellow-400 fill-current' : 'text-gray-300 hover:text-yellow-300'} 
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-slate-600">
                    {newReflection.rating}/5
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Reflection Content</label>
                <textarea
                  value={newReflection.content}
                  onChange={(e) => setNewReflection({ ...newReflection, content: e.target.value })}
                  placeholder={`Share your thoughts about ${tabs.find(t => t.key === activeTab)?.label.toLowerCase()}...`}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddReflection}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Reflection
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reflections List */}
        <div className="space-y-4">
          {getCurrentCategoryData().length > 0 ? (
            getCurrentCategoryData().map(reflection => (
              <div key={reflection.id} className="border border-slate-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      reflection.reviewType === 'self' ? 'bg-blue-100' : 'bg-red-600'
                    }`}>
                      {reflection.reviewType === 'self' ? 
                        <User size={16} className={reflection.reviewType === 'self' ? 'text-blue-600' : 'text-purple-600'} /> :
                        <Crown size={16} className="text-purple-600" />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          reflection.reviewType === 'self' ? 'bg-blue-100 text-blue-700' : 'bg-red-600 text-purple-700'
                        }`}>
                          {reflection.reviewType === 'self' ? 'Self Review' : 'Manager Review'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          reflection.priority === 'High' ? 'bg-red-100 text-red-700' :
                          reflection.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {reflection.priority} Priority
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        by {reflection.author} • {new Date(reflection.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {reflection.rating && (
                      <div className="flex items-center gap-1">
                        {renderStars(reflection.rating)}
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteReflection(getCurrentCategoryKey(), reflection.id)}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-slate-700 leading-relaxed">{reflection.content}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500">
              <div className="flex justify-center mb-4">
                {tabs.find(t => t.key === activeTab)?.icon && (
                  React.createElement(tabs.find(t => t.key === activeTab)!.icon, { 
                    size: 48, 
                    className: "text-slate-300" 
                  })
                )}
              </div>
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

      {/* Quick Add Templates */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Reflection Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-slate-700">Self Review Prompts:</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• What skill did I develop or improve this sprint?</li>
              <li>• What challenge helped me grow the most?</li>
              <li>• How did I contribute to team success?</li>
              <li>• What would I do differently next time?</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-slate-700">Manager Review Prompts:</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• How did the team member exceed expectations?</li>
              <li>• What development areas should they focus on?</li>
              <li>• How did they impact team dynamics?</li>
              <li>• What support do they need for growth?</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReflectionTab;