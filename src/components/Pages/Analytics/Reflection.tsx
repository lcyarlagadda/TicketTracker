// components/Analytics/ReflectionNew.tsx - Simplified Reflection System
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BookOpen,
  Users,
  Lightbulb,
  Target,
  Plus,
  X,
  Star,
  MessageCircle,
  User,
  Crown,
} from "lucide-react";
import { useAppSelector } from "../../../hooks/redux";
import {
  Task,
  Board,
  Sprint,
  PrivateReflectionData,
  NewCategoryReflectionForm,
  CategoryReflection,
  TabKey,
} from "../../../store/types/types";
import { useParams } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import { sprintService } from "../../../services/sprintService";
import { privateReflectionService } from "../../../services/privateReflectionService";

interface ReflectionProps {
  board: Board;
  tasks: Task[];
}

const Reflection: React.FC<ReflectionProps> = ({ board, tasks }) => {
  const { user } = useAppSelector((state) => state.auth);
  const { sprintNo } = useParams();

  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [reflectionData, setReflectionData] = useState<PrivateReflectionData>({
    sprintId: "",
    sprintNumber: 0,
    userId: "",
    userEmail: "",
    userName: "",
    personalGrowth: {},
    teamInsights: {},
    lessonsLearned: {},
    futureGoals: {},
    lastUpdated: "",
    isPrivate: true,
  });
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'user'>('user');
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>('');
  const [teamReflections, setTeamReflections] = useState<{[userId: string]: PrivateReflectionData}>({});
  const [uidToAccessMap, setUidToAccessMap] = useState<{[uid: string]: any}>({});

  const [activeTab, setActiveTab] = useState<TabKey>("personal");
  const [newReflection, setNewReflection] = useState<NewCategoryReflectionForm>({
    content: "",
    category: "",
    rating: undefined,
  });
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // Fetch team reflections for managers only
  const fetchTeamReflections = async (sprintId: string) => {
    console.log('fetchTeamReflections called with:', { userRole, boardId: board.id, sprintId });
    if (!user || !board.id || userRole !== 'manager') {
      console.log('fetchTeamReflections early return:', { user: !!user, boardId: board.id, userRole });
      return;
    }

    try {
      const teamReflectionsData: {[userId: string]: PrivateReflectionData} = {};
      
      // Get all board access documents to find user UIDs
      const boardAccessQuery = query(
        collection(db, 'boardAccess'),
        where('boardId', '==', board.id)
      );
      const accessSnapshot = await getDocs(boardAccessQuery);
      
      // Create a map of UID to boardAccess data
      const uidToAccessMap: {[uid: string]: any} = {};
      accessSnapshot.docs.forEach(doc => {
        const data = doc.data();
        uidToAccessMap[data.userId] = data;
      });
      setUidToAccessMap(uidToAccessMap);
      
      // Fetch reflections for all team members using UID matching
      for (const collaborator of board.collaborators) {
        if (collaborator.email !== user.email) {
          let reflection: PrivateReflectionData | null = null;
          
          // Try each UID from boardAccess to see if any match this collaborator
          for (const [uid, accessData] of Object.entries(uidToAccessMap)) {
            try {
              const testReflection = await privateReflectionService.getPrivateReflection(
                uid,
                board.id,
                sprintId,
                user.uid
              );
              if (testReflection && testReflection.userEmail === collaborator.email) {
                reflection = testReflection;
                console.log(`Found reflection for ${collaborator.email} using UID ${uid}:`, reflection);
                break;
              }
            } catch (error) {
              // This UID doesn't match, continue to next one
              continue;
            }
          }
          
          if (reflection) {
            teamReflectionsData[collaborator.email] = reflection;
          }
        }
      }
      
      console.log('Team reflections fetched:', teamReflectionsData);
      setTeamReflections(teamReflectionsData);
    } catch (error) {
      console.error('Error fetching team reflections:', error);
    }
  };

  // Fetch sprint data and user role
  useEffect(() => {
    const fetchSprintData = async () => {
      if (!user || !board.id || !sprintNo) return;

      try {
        const targetSprint = await sprintService.fetchBoardSprints(user.uid, board.id);
        const sprint = targetSprint.find(s => s.sprintNumber === parseInt(sprintNo));
        
        if (sprint) {
          setSprint(sprint);
          
          // Determine user role
          const accessDoc = await getDocs(query(
            collection(db, 'boardAccess'),
            where('boardId', '==', board.id),
            where('userId', '==', user.uid)
          ));
          
          if (accessDoc.docs.length > 0) {
            const role = accessDoc.docs[0].data().role;
            console.log('User role from boardAccess:', role);
            setUserRole(role);
          } else if (board.createdBy.uid === user.uid) {
            console.log('User is board creator, setting role to admin');
            setUserRole('admin');
          } else {
            console.log('No access found, setting role to user');
            setUserRole('user');
          }

          // Fetch user's own reflection data
          try {
            const reflection = await privateReflectionService.getPrivateReflection(
              user.uid,
              board.id,
              sprint.id,
              user.uid
            );
            if (reflection) {
              setReflectionData(reflection);
            }
          } catch (error) {
            console.log('No reflection data found for user');
          }

          // Fetch team reflections if user is manager only
          const currentRole = accessDoc.docs.length > 0 ? accessDoc.docs[0].data().role : 
                             (board.createdBy.uid === user.uid ? 'admin' : 'user');
          console.log('Current role for team reflections fetch:', currentRole);
          if (currentRole === 'manager') {
            await fetchTeamReflections(sprint.id);
          }
        }
      } catch (error) {
        console.error('Error fetching sprint data:', error);
      }
    };

    fetchSprintData();
  }, [user, board.id, sprintNo, board, userRole]);

  // Auto-save reflection data
  const saveReflectionData = useCallback(async (): Promise<void> => {
    if (!user || !board.id || !sprint) return;

    // Check if there's actual content to save
    const hasContent = Object.values(reflectionData).some(
      (category) => typeof category === 'object' && category !== null && 
      (category.userReview || category.managerResponse)
    );
    
    if (!hasContent) {
      console.log('No content to save, skipping auto-save');
      return;
    }

    try {
      // Clean the data to remove undefined values
      const cleanReflectionData = (obj: any): any => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(cleanReflectionData);
        
        const cleaned: any = {};
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          if (value !== undefined) {
            cleaned[key] = cleanReflectionData(value);
          }
        });
        return cleaned;
      };

      const cleanedData = cleanReflectionData(reflectionData);
      console.log('Saving reflection data with content:', cleanedData);
      
      await privateReflectionService.savePrivateReflection(
        user.uid,
        user.email || "",
        user.displayName || user.email || "Current User",
        board.id,
        sprint.id,
        sprint.sprintNumber,
        cleanedData
      );
      console.log('Reflection data saved successfully');
    } catch (error) {
      console.error('Error saving reflection data:', error);
    }
  }, [user, board.id, sprint, reflectionData]);

  useEffect(() => {
    const hasContent = Object.values(reflectionData).some(
      (category) => typeof category === 'object' && category !== null && 
      (category.userReview || category.managerResponse)
    );
    
    if (sprint && reflectionData && hasContent) {
      const timeoutId = setTimeout(saveReflectionData, 2000);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [reflectionData, sprint, saveReflectionData]);

  const handleAddReflection = async (): Promise<void> => {
    if (!newReflection.content.trim() || !user) return;
    
    console.log('Adding reflection:', {
      content: newReflection.content.trim(),
      category: newReflection.category,
      activeTab,
      selectedTeamMember,
      userRole
    });

    const category =
      activeTab === "personal"
        ? "personalGrowth"
        : activeTab === "team"
        ? "teamInsights"
        : activeTab === "lessons"
        ? "lessonsLearned"
        : "futureGoals";

    const newItem = {
      id: Date.now().toString(),
      content: newReflection.content.trim(),
      author: user.displayName || user.email || "Current User",
      authorEmail: user.email || "",
      createdAt: new Date().toISOString(),
      ...(selectedTeamMember && (userRole === 'manager' || userRole === 'admin') && { rating: newReflection.rating || 0 })
    };

    // If viewing team member reflections, save manager response to their data
    if (selectedTeamMember && (userRole === 'manager' || userRole === 'admin')) {
      const teamMemberData = teamReflections[selectedTeamMember];
      if (teamMemberData) {
        const updatedTeamMemberData = {
          ...teamMemberData,
          [category]: {
            ...teamMemberData[category],
            managerResponse: newItem
          }
        };
        setTeamReflections({
          ...teamReflections,
          [selectedTeamMember]: updatedTeamMemberData
        });
        
        // Find the UID for this team member
        let teamMemberUid = null;
        for (const [uid, accessData] of Object.entries(uidToAccessMap)) {
          try {
            const testReflection = await privateReflectionService.getPrivateReflection(
              uid,
              board.id,
              sprint?.id || "",
              user.uid
            );
            if (testReflection && testReflection.userEmail === selectedTeamMember) {
              teamMemberUid = uid;
              break;
            }
          } catch (error) {
            continue;
          }
        }
        
        if (teamMemberUid) {
          // Save to the team member's reflection data using their UID
          privateReflectionService.savePrivateReflection(
            teamMemberUid,
            teamMemberData.userEmail,
            teamMemberData.userName,
            board.id,
            sprint?.id || "",
            sprint?.sprintNumber || 0,
            updatedTeamMemberData
          );
          console.log(`Saved manager response for ${selectedTeamMember} using UID ${teamMemberUid}`);
        } else {
          console.error(`Could not find UID for team member ${selectedTeamMember}`);
        }
      }
    } else {
      // Save user review to current user's reflection data
      const updatedReflectionData = {
        ...reflectionData,
        [category]: {
          ...reflectionData[category],
          userReview: newItem
        }
      };
      console.log('Updated reflection data:', updatedReflectionData);
      setReflectionData(updatedReflectionData);
    }

    setNewReflection({
      content: "",
      category: "",
      rating: undefined,
    });
    setShowAddForm(false);
  };

  const getCurrentCategoryData = (): CategoryReflection => {
    const category =
      activeTab === "personal"
        ? "personalGrowth"
        : activeTab === "team"
        ? "teamInsights"
        : activeTab === "lessons"
        ? "lessonsLearned"
        : "futureGoals";

    if (selectedTeamMember && (userRole === 'manager' || userRole === 'admin')) {
      const teamMemberData = teamReflections[selectedTeamMember];
      return teamMemberData ? teamMemberData[category] : {};
    }
    
    return reflectionData[category] || {};
  };

  const canAddUserReview = (): boolean => {
    if (userRole === 'manager') {
      return false; // Managers can't add user reviews (they only provide manager responses)
    }
    if (selectedTeamMember) {
      return false; // Can't add user reviews when viewing team members
    }
    const categoryData = getCurrentCategoryData();
    return !categoryData.userReview; // Can add if no user review exists
  };

  const canAddManagerResponse = (): boolean => {
    if (!selectedTeamMember || userRole !== 'manager') {
      return false; // Only managers can add responses when viewing team members
    }
    const categoryData = getCurrentCategoryData();
    return Boolean(categoryData.userReview && !categoryData.managerResponse); // Can add if user review exists but no manager response
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"}
          />
        ))}
      </div>
    );
  };

  const renderCategoryContent = () => {
    const categoryData = getCurrentCategoryData();
    const categoryName = 
      activeTab === "personal" ? "Personal Growth" :
      activeTab === "team" ? "Team Insights" :
      activeTab === "lessons" ? "Lessons Learned" :
      "Future Goals";

    return (
      <div className="space-y-6">
        {/* User Review Section */}
        {categoryData.userReview && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User size={16} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-800">User Review</h3>
                <p className="text-sm text-blue-600">
                  by {categoryData.userReview.author} • {new Date(categoryData.userReview.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-slate-700 whitespace-pre-wrap">
              {categoryData.userReview.content}
            </div>
          </div>
        )}

        {/* Manager Response Section */}
        {categoryData.managerResponse && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Crown size={16} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-purple-800">Manager Response</h3>
                <p className="text-sm text-purple-600">
                  by {categoryData.managerResponse.author} • {new Date(categoryData.managerResponse.createdAt).toLocaleDateString()}
                </p>
              </div>
              {categoryData.managerResponse.rating && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-purple-600">Rating:</span>
                  {renderStars(categoryData.managerResponse.rating)}
                </div>
              )}
            </div>
            <div className="text-slate-700 whitespace-pre-wrap">
              {categoryData.managerResponse.content}
            </div>
          </div>
        )}

        {/* Add Form Section */}
        {showAddForm && (
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-800 mb-4">
              {canAddManagerResponse() ? `Add Manager Response for ${categoryName}` : `Add ${categoryName} Review`}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {canAddManagerResponse() ? "Manager Response" : "Your Review"}
                </label>
                <textarea
                  value={newReflection.content}
                  onChange={(e) => setNewReflection({ ...newReflection, content: e.target.value })}
                  placeholder={canAddManagerResponse() ? "Provide feedback and rating..." : "Share your thoughts..."}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                />
              </div>

              {canAddManagerResponse() && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Rating (1-5 stars)
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReflection({ ...newReflection, rating: star })}
                        className="p-1"
                      >
                        <Star
                          size={24}
                          className={star <= (newReflection.rating || 0) ? "text-yellow-400 fill-current" : "text-gray-300"}
                        />
                      </button>
                    ))}
                    <span className="text-sm text-slate-600 ml-2">
                      {newReflection.rating ? `${newReflection.rating}/5` : "Select rating"}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleAddReflection}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {canAddManagerResponse() ? "Add Manager Response" : "Add Review"}
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

        {/* Add Button */}
        {!showAddForm && (canAddUserReview() || canAddManagerResponse()) && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full p-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            {canAddManagerResponse() ? "Add Manager Response" : `Add ${categoryName} Review`}
          </button>
        )}

        {/* Empty State */}
        {!categoryData.userReview && !categoryData.managerResponse && !showAddForm && (
          <div className="text-center py-12 text-slate-500">
            <BookOpen size={48} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium mb-2">No {categoryName.toLowerCase()} yet</h3>
            <p className="text-sm mb-4">
              {selectedTeamMember 
                ? `This team member hasn't added a ${categoryName.toLowerCase()} review yet.`
                : `Start your ${categoryName.toLowerCase()} reflection for this sprint.`
              }
            </p>
            {canAddUserReview() && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add {categoryName} Review
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    { key: "personal" as TabKey, label: "Personal Growth", icon: User },
    { key: "team" as TabKey, label: "Team Insights", icon: Users },
    { key: "lessons" as TabKey, label: "Lessons Learned", icon: Lightbulb },
    { key: "goals" as TabKey, label: "Future Goals", icon: Target },
  ];

  return (
    <div className="space-y-6 p-4 tablet:p-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 tablet:p-6">
        <div className="flex flex-col tablet:flex-row tablet:items-center gap-3 mb-4">
          <BookOpen size={24} className="text-blue-600" />
          <div className="flex-1">
            <h2 className="text-xl tablet:text-2xl font-bold text-slate-800">
              {sprint?.name} - Reflection
              {(userRole === 'manager' || userRole === 'admin') && selectedTeamMember && (
                <span className="text-lg font-normal text-slate-600 ml-2">
                  - {board.collaborators.find(c => c.email === selectedTeamMember)?.name}
                </span>
              )}
            </h2>
            <p className="text-sm tablet:text-base text-slate-600">
              {selectedTeamMember 
                ? `Viewing ${board.collaborators.find(c => c.email === selectedTeamMember)?.name}'s reflections`
                : "Share your thoughts and receive manager feedback"
              }
            </p>
          </div>
        </div>

        {/* Team Member Selector for Managers Only */}
        {userRole === 'manager' && (
          <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Team Member
            </label>
            <div className="flex items-center gap-3">
              <select
                value={selectedTeamMember}
                onChange={(e) => setSelectedTeamMember(e.target.value)}
                className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">View My Own Reflections</option>
                {board.collaborators
                  .filter(collab => collab.email !== user?.email)
                  .map((collab) => (
                    <option key={collab.email} value={collab.email}>
                      {collab.name} ({collab.email})
                    </option>
                  ))}
              </select>
              <div className="text-xs text-slate-500">
                {board.collaborators.filter(collab => collab.email !== user?.email).length} team members
              </div>
            </div>
            {/* Debug info */}
            <div className="mt-2 text-xs text-slate-400">
              Debug: userRole={userRole}, collaborators={board.collaborators.length}
            </div>
          </div>
        )}
      </div>

      {/* Reflection Metrics */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 tablet:p-6">
        <div className="grid grid-cols-2 tablet:grid-cols-4 gap-4">
          {/* Total Reflections */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl tablet:text-3xl font-bold text-blue-600 mb-1">
              {(() => {
                const total = Object.values(reflectionData).filter(cat => 
                  cat.userReview || cat.managerResponse
                ).length;
                return total;
              })()}
            </div>
            <div className="text-sm font-medium text-blue-700">Total Reflections</div>
          </div>

          {/* Self Reviews */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl tablet:text-3xl font-bold text-green-600 mb-1">
              {(() => {
                const selfReviews = Object.values(reflectionData).filter(cat => 
                  cat.userReview
                ).length;
                return selfReviews;
              })()}
            </div>
            <div className="text-sm font-medium text-green-700">Self Reviews</div>
          </div>

          {/* Manager Reviews */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
            <div className="text-2xl tablet:text-3xl font-bold text-slate-800 mb-1">
              {(() => {
                const managerReviews = Object.values(reflectionData).filter(cat => 
                  cat.managerResponse
                ).length;
                return managerReviews;
              })()}
            </div>
            <div className="text-sm font-medium text-slate-700">Manager Reviews</div>
          </div>

          {/* Average Rating */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <div className="flex justify-center mb-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const avgRating = (() => {
                  const ratings = Object.values(reflectionData)
                    .map(cat => cat.managerResponse?.rating)
                    .filter(rating => rating !== undefined) as number[];
                  return ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;
                })();
                
                return (
                  <svg
                    key={star}
                    className={`w-4 h-4 ${star <= Math.round(avgRating) ? 'text-yellow-400 fill-current' : 'text-yellow-300'}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                );
              })}
            </div>
            <div className="text-sm font-medium text-yellow-700">
              Avg Rating: {(() => {
                const ratings = Object.values(reflectionData)
                  .map(cat => cat.managerResponse?.rating)
                  .filter(rating => rating !== undefined) as number[];
                return ratings.length > 0 ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1) : '0';
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Reflection Templates */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 tablet:p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Reflection Templates</h3>
        <div className="grid grid-cols-1 tablet:grid-cols-2 gap-6">
          {/* Self Review Prompts */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-slate-800 mb-3">Self Review Prompts:</h4>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>What skill did I develop or improve this sprint?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>What challenge helped me grow the most?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>How did I contribute to team success?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>What would I do differently next time?</span>
              </li>
            </ul>
          </div>

          {/* Manager Review Prompts */}
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-semibold text-slate-800 mb-3">Manager Review Prompts:</h4>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span>How did the team member exceed expectations?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span>What development areas should they focus on?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span>How did they impact team dynamics?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span>What support do they need for growth?</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 tablet:p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {renderCategoryContent()}
      </div>
    </div>
  );
};

export default Reflection;
