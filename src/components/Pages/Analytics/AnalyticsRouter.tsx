// components/Analytics/AnalyticsRouter.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Target, BarChart3, MessageSquare, BookOpen, Calendar, Users } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { useTasksSync } from '../../../hooks/useFirebaseSync';
import { fetchBoard } from '../../../store/slices/boardSlice';
import SprintPlanning from './SprintPlanning';
import AnalyticsTab from './Analytics';
import RetrospectiveTab from './Retrospective';
import ReflectionTab from './Reflection';

const AnalyticsRouter: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { currentBoard, loading } = useAppSelector(state => state.boards);
  const tasks = useTasksSync(boardId || '');

  // State for active tab
  const [activeTab, setActiveTab] = useState<string>('planning');

  // Fetch board data if not already loaded
  useEffect(() => {
    if (user && boardId && (!currentBoard || currentBoard.id !== boardId)) {
      dispatch(fetchBoard({ userId: user.uid, boardId }));
    }
  }, [user, boardId, currentBoard, dispatch]);

  // Update active tab based on URL
  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    const tabFromUrl = pathSegments[pathSegments.length - 1];
    
    if (['planning', 'analytics', 'retro', 'reflection'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else {
      setActiveTab('planning');
    }
  }, [location.pathname]);

  // Handle tab change
  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    navigate(`/board/${boardId}/${tabKey}`);
  };

  if (loading || !currentBoard || !boardId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { 
      key: 'planning', 
      label: 'Sprint Planning', 
      icon: Target, 
      color: 'blue',
      description: 'Plan goals, features, story points, and working hours'
    },
    { 
      key: 'analytics', 
      label: 'Analytics', 
      icon: BarChart3, 
      color: 'green',
      description: 'Track burndown, velocity, and team performance'
    },
    { 
      key: 'retro', 
      label: 'Retrospective', 
      icon: MessageSquare, 
      color: 'purple',
      description: 'Reflect on what went well and actionable improvements'
    },
    { 
      key: 'reflection', 
      label: 'Reflection', 
      icon: BookOpen, 
      color: 'orange',
      description: 'Self and manager reviews for personal growth'
    }
  ];

  const getTabColor = (color: string, isActive: boolean) => {
    if (isActive) {
      switch(color) {
        case 'blue': return 'bg-blue-600 text-white shadow-lg border-blue-600';
        case 'green': return 'bg-green-600 text-white shadow-lg border-green-600';
        case 'purple': return 'bg-red-600 text-white shadow-lg border-purple-600';
        case 'orange': return 'bg-orange-600 text-white shadow-lg border-orange-600';
        default: return 'bg-blue-600 text-white shadow-lg border-blue-600';
      }
    }
    return 'text-slate-600 hover:bg-slate-100 border-transparent hover:border-slate-200';
  };

  const renderCurrentTab = () => {
    switch(activeTab) {
      case 'planning':
        return <SprintPlanning board={currentBoard} tasks={tasks} />;
      case 'analytics':
        return <AnalyticsTab tasks={tasks} board={currentBoard} />;
      case 'retro':
        return <RetrospectiveTab board={currentBoard} tasks={tasks} />;
      case 'reflection':
        return <ReflectionTab board={currentBoard} tasks={tasks} />;
      default:
        return <SprintPlanning board={currentBoard} tasks={tasks} />;
    }
  };

  const getCurrentTabInfo = () => {
    return tabs.find(tab => tab.key === activeTab) || tabs[0];
  };

  const currentTabInfo = getCurrentTabInfo();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Back button and board info */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(`/board/${boardId}`)}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors group"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span>Back to Board</span>
              </button>
              <div className="h-6 w-px bg-slate-300"></div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">{currentBoard.title}</h1>
                <p className="text-sm text-slate-500">Sprint Management & Analytics</p>
              </div>
            </div>
            
            {/* Right side - Board stats */}
            <div className="hidden lg:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-slate-400" />
                <span className="text-slate-600">{currentBoard.collaborators.length} members</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-slate-400" />
                <span className="text-slate-600">{tasks.length} tasks</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-1 py-2">
            {tabs.map(tab => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all border-2 ${
                    getTabColor(tab.color, isActive)
                  }`}
                >
                  <IconComponent size={18} />
                  <div className="text-left">
                    <div className="font-medium">{tab.label}</div>
                    <div className={`text-xs ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                      {tab.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-slate-100 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Boards</span>
            <span>/</span>
            <span>{currentBoard.title}</span>
            <span>/</span>
            <span className="text-slate-800 font-medium">
              {currentTabInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Tab Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <currentTabInfo.icon size={24} className={`text-${currentTabInfo.color}-600`} />
            <h2 className="text-2xl font-bold text-slate-800">{currentTabInfo.label}</h2>
          </div>
          <p className="text-slate-600">{currentTabInfo.description}</p>
        </div>

        {/* Render current tab content */}
        <div className="tab-content">
          {renderCurrentTab()}
        </div>
      </div>

      {/* Quick Actions Footer (Optional) */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-4">
          <div className="text-xs text-slate-500 mb-2">Quick Actions</div>
          <div className="flex gap-2">
            {tabs.map(tab => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.key;
              if (isActive) return null;
              
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`p-2 rounded-lg transition-colors ${
                    tab.color === 'blue' ? 'hover:bg-blue-100 text-blue-600' :
                    tab.color === 'green' ? 'hover:bg-green-100 text-green-600' :
                    tab.color === 'purple' ? 'hover:bg-red-600 text-purple-600' :
                    'hover:bg-orange-100 text-orange-600'
                  }`}
                  title={tab.label}
                >
                  <IconComponent size={16} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsRouter;