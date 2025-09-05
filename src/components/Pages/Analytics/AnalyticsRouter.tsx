// components/Analytics/SprintRouter.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Target, BarChart3, MessageSquare, BookOpen, Calendar, Users, AlertTriangle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { useTasksSync } from '../../../hooks/useFirebaseSync';
import { fetchBoard } from '../../../store/slices/boardSlice';
import { sprintService } from '../../../services/sprintService';
import { Sprint } from '../../../store/types/types';
import SprintAnalytics from './Analytics';
import RetrospectiveTab from './Retrospective';
import ReflectionTab from './Reflection';

const SprintRouter: React.FC = () => {
  const { boardId, sprintNo } = useParams<{ boardId: string; sprintNo: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { currentBoard, loading } = useAppSelector(state => state.boards);
  const tasks = useTasksSync(boardId || '');

  // State for active tab and sprint data
  const [activeTab, setActiveTab] = useState<string>('analytics');
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [sprintLoading, setSprintLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch board data if not already loaded
  useEffect(() => {
    if (user && boardId && (!currentBoard || currentBoard.id !== boardId)) {
      dispatch(fetchBoard({ userId: user.uid, boardId }));
    }
  }, [user, boardId, currentBoard, dispatch]);

  // Fetch sprint data
  useEffect(() => {
    const fetchSprintData = async () => {
      if (!user || !boardId || !sprintNo) return;
      
      setSprintLoading(true);
      try {
        const sprints = await sprintService.fetchBoardSprints(user.uid, boardId);
        const targetSprint = sprints.find(s => s.sprintNumber === parseInt(sprintNo));
        
        if (!targetSprint) {
          setError(`Sprint ${sprintNo} not found`);
        } else {
          setSprint(targetSprint);
        }
      } catch (error) {
        console.error('Error fetching sprint data:', error);
        setError('Failed to load sprint data');
      } finally {
        setSprintLoading(false);
      }
    };

    fetchSprintData();
  }, [user, boardId, sprintNo]);

  // Update active tab based on URL
  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    const tabFromUrl = pathSegments[pathSegments.length - 1];
    
    if (['analytics', 'retro', 'reflection'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else {
      setActiveTab('analytics');
    }
  }, [location.pathname]);

  // Handle tab change
  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    navigate(`/board/${boardId}/${sprintNo}/${tabKey}`);
  };

  // Loading state
  if (loading || sprintLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading sprint data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !currentBoard || !boardId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Error Loading Sprint</h2>
          <p className="text-slate-600 mb-4">{error || 'Board not found'}</p>
          <button 
            onClick={() => navigate(`/board/${boardId}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Board
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { 
      key: 'analytics', 
      label: 'Analytics', 
      icon: BarChart3, 
      color: 'green',
      description: 'Sprint burndown, velocity, and team performance metrics'
    },
    { 
      key: 'retro', 
      label: 'Retrospective', 
      icon: MessageSquare, 
      color: 'purple',
      description: 'Sprint review: what went well, improvements, and actions'
    },
    { 
      key: 'reflection', 
      label: 'Reflection', 
      icon: BookOpen, 
      color: 'orange',
      description: 'Personal and manager reflections for growth'
    }
  ];

  const getTabColor = (color: string, isActive: boolean) => {
    if (isActive) {
      switch(color) {
        case 'green': return 'bg-green-600 text-white shadow-lg border-green-600';
        case 'purple': return 'bg-red-600 text-white shadow-lg border-purple-600';
        case 'orange': return 'bg-orange-600 text-white shadow-lg border-orange-600';
        default: return 'bg-blue-600 text-white shadow-lg border-blue-600';
      }
    }
    return 'text-slate-600 hover:bg-slate-100 border-transparent hover:border-slate-200';
  };

  const renderCurrentTab = () => {
    if (!sprint) return null;

    switch(activeTab) {
      case 'analytics':
        return <SprintAnalytics tasks={tasks.filter(t => t.sprintId === sprint.id)} board={currentBoard} />;
      case 'retro':
        // Create proper RetroData structure with defaults
        const retroDataWithDefaults = {
          items: currentBoard.retroData?.items || [],
          lastUpdated: currentBoard.retroData?.lastUpdated || '',
          sprintName: currentBoard.retroData?.sprintName || sprint.name,
          facilitator: currentBoard.retroData?.facilitator || user?.displayName || user?.email || 'Anonymous',
          sprintId: sprint.id
        };
        return <RetrospectiveTab board={{ ...currentBoard, retroData: retroDataWithDefaults }} tasks={tasks.filter(t => t.sprintId === sprint.id)} />;
      case 'reflection':
        // Create proper ReflectionData structure with defaults
        const reflectionDataWithDefaults = {
          personalGrowth: currentBoard.reflectionData?.personalGrowth || [],
          teamInsights: currentBoard.reflectionData?.teamInsights || [],
          lessonsLearned: currentBoard.reflectionData?.lessonsLearned || [],
          futureGoals: currentBoard.reflectionData?.futureGoals || [],
          lastUpdated: currentBoard.reflectionData?.lastUpdated || null,
          sprintId: sprint.id
        };
        return <ReflectionTab board={{ ...currentBoard, reflectionData: reflectionDataWithDefaults }} tasks={tasks.filter(t => t.sprintId === sprint.id)} />;
      default:
        return <SprintAnalytics tasks={tasks} board={currentBoard} />;
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
            {/* Left side - Back button and sprint info */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(`/board/${boardId}/planning`)}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors group"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span>Back to Planning</span>
              </button>
              <div className="h-6 w-px bg-slate-300"></div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  {sprint ? sprint.name : `Sprint ${sprintNo}`}
                </h1>
                <p className="text-sm text-slate-500">
                  {currentBoard.title} • Sprint Management & Analytics
                </p>
              </div>
            </div>
            
            {/* Right side - Sprint stats */}
            <div className="hidden lg:flex items-center gap-6 text-sm">
              {sprint && (
                <>
                  <div className="flex items-center gap-2">
                    <Target size={16} className="text-slate-400" />
                    <span className="text-slate-600">{sprint.totalStoryPoints} story points</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    <span className="text-slate-600">
                    {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-slate-400" />
                    <span className="text-slate-600">
                      {sprint.status === 'active' || sprint.status === 'planning'
                        ? (currentBoard?.collaborators?.length || sprint.teamSize)
                        : sprint.teamSize
                      } team members
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    sprint.status === 'active' ? 'bg-green-100 text-green-700' :
                    sprint.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    sprint.status === 'planning' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {sprint.status}
                  </span>
                </>
              )}
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

      {/* Quick Sprint Navigation (Optional) */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-4">
          <div className="text-xs text-slate-500 mb-2">Sprint Navigation</div>
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

export default SprintRouter;