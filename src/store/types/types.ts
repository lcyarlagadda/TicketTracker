// types/index.ts
export interface User {
  uid: string;
  email: string;
  displayName?: string | null;
  emailVerified?: boolean;
}

export type BoardRole = 'admin' | 'manager' | 'user';

export interface Collaborator {
  name: string;
  email: string;
  role: BoardRole;
}

export interface BoardPermissions {
  canManageColumns: boolean;
  canManageCollaborators: boolean;
  canManageSprints: boolean;
  canGiveManagerReviews: boolean;
  canDeleteBoard: boolean;
  canEditBoardSettings: boolean;
}

export interface UserBoardRole {
  userId: string;
  role: BoardRole;
  permissions: BoardPermissions;
}

export interface Board {
  id: string;
  title: string;
  category: string;
  description?: string;
  tags: string[];
  imageUrl?: string;
  imageFile?: File;
  createdBy: {
    uid: string;
    email: string;
    name: string;
  };
  collaborators: Collaborator[];
  statuses: string[];
  createdAt: string;
  retroData?: RetroData;
  reflectionData?: ReflectionData;
  burndownData?: BurndownData; 
  sprintPlanningData?: SprintPlanningData;
  // Add index signature to allow dynamic sprint-specific data
  [key: string]: any;
}


export interface ProgressLogEntry {
  desc: string;
  type: 'created' | 'status-change' | 'assignment-change' | 'description-change' | 'points-change' |
        'dueDate-change' | 'epics-change' | 'file-upload' | 'child-task-added' | 'priority-change' | 'title-change' |
        'child-task-deleted' | 'task-updated' | 'child-task-updated' | 'child-task-status-changed' | 'sprint-change'| 'type-change';
  to?: string;
  timestamp: string;
  user: string;
}

// Enhanced types for Sprint Management - Add to types.ts

export interface Sprint {
  id: string;
  boardId: string;
  sprintNumber: number;
  name: string;
  goals: string[];
  keyFeatures: string[];
  bottlenecks: string[];
  duration: number; // in days
  estimatedWorkHoursPerWeek: number;
  teamSize: number;
  holidays: string[]; // array of holiday dates
  finalizedCapacity: number; // calculated capacity after holidays
  capacityUtilization: number; // percentage
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  createdBy: {
    uid: string;
    email: string;
    name: string;
  };
  // Calculated fields
  totalStoryPoints: number;
  estimatedCapacity: number; // duration * work hours * team size
  actualVelocity?: number; // filled when sprint completes
  burndownData?: SprintBurndownData[];
  taskIds: string[]; // tasks assigned to this sprint
  risks?: string[];
  // Completion tracking fields
  initialStoryPoints?: number; // Story points planned at sprint start
  completedStoryPoints?: number; // Story points actually completed
  spilloverStoryPoints?: number; // Story points moved to next sprint
  completionRate?: number; // Percentage of tasks completed
  completedAt?: string; // When sprint was completed
  teamCapacityPerWeek?: number;
}

export interface SprintBurndownData {
  date: string;
  remainingPoints: number;
  idealPoints: number;
  completedPoints: number;
  workingDay: boolean;
}

export interface SprintMetrics {
  totalSprints: number;
  activeSprints: number;
  completedSprints: number;
  averageVelocity: number;
  averageCapacityUtilization: number;
  totalStoryPointsDelivered: number;
}

export interface SprintAnalytics {
  sprint: Sprint;
  teamPerformance: {
    topPerformers: ContributorMetrics[];
    teamVelocity: number;
    burndownTrend: 'ahead' | 'on-track' | 'behind';
    completionRate: number;
  };
  insights: {
    bottlenecksIdentified: string[];
    improvements: string[];
    shoutouts: string[];
  };
}

export interface CreateSprintForm {
  sprintNumber: number;
  name: string;
  goals: string[];
  keyFeatures: string[];
  bottlenecks: string[];
  duration: number;
  estimatedWorkHoursPerWeek: number;
  startDate: string;
  endDate: string;
  holidays: string[];
  risks: string[];
  teamCapacityPerWeek: number;
}

// Enhanced Board interface to include sprints
export interface BoardWithSprints extends Board {
  sprints?: Sprint[];
  currentSprintId?: string;
}

// Sprint service methods interface
export interface SprintServiceMethods {
  createSprint(userId: string, boardId: string, sprintData: Omit<Sprint, 'id'>): Promise<Sprint>;
  updateSprint(userId: string, boardId: string, sprintId: string, updates: Partial<Sprint>): Promise<void>;
  fetchBoardSprints(userId: string, boardId: string): Promise<Sprint[]>;
  deleteSprint(userId: string, boardId: string, sprintId: string): Promise<void>;
  assignTasksToSprint(userId: string, boardId: string, sprintId: string, taskIds: string[]): Promise<void>;
  completeActiveSprint(userId: string, boardId: string, sprintId: string): Promise<Sprint>;
}

export interface Comment {
  text: string;
  timestamp: string;
  user: string;
  edited?: boolean;
}

export interface FileAttachment {
  name: string;
  url: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  status: string;
  epics: string[];
  assignedTo: {
    uid: string;
    email: string;
    name: string;
  } | null;
  createdAt: string;
  createdBy: {
    uid: string;
    email: string;
    name: string;
  };
  progressLog: ProgressLogEntry[];
  comments: Comment[];
  files: FileAttachment[];
  parentTaskId?: string;
  boardId: string;
  points: number | null;
  sprintId?: string;
  sprintName?: string;
  type: TaskType;
}

export type TaskType =  'epic' | 'feature' | 'story' | 'bug' | 'enhancement' | 'subtask' | 'poc';

export interface CalendarTask extends Task {
  isSubtask?: boolean;
  parentTaskTitle?: string;
  boardTitle?: string;
}

// Redux State Types
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface BoardsState {
  boards: Board[];
  currentBoard: Board | null;
  loading: boolean;
  error: string | null;
}

export interface TasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  selectedTask: Task | null;
}

export interface RootState {
  auth: AuthState;
  boards: BoardsState;
  tasks: TasksState;
}

// types/analytics.types.ts

export interface ReflectionItem {
  id: number;
  content: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  author: string;
  createdAt: string;
  tags: string[];
  reviewType: 'self' | 'manager';
  rating?: number; // 1-5 star rating
}

// Extended board types with analytics data
export interface BoardWithAnalytics extends Board {
  retroData?: RetroData;
  reflectionData?: ReflectionData;
}

// Analytics component props
export interface AnalyticsComponentProps {
  board: BoardWithAnalytics;
  tasks: Task[];
}

// Burndown chart data
export interface BurndownDataPoint {
  day: number;
  date: string;
  remaining: number;
  ideal: number;
  completed: number;
}

// Velocity chart data
export interface VelocityDataPoint {
  week: string;
  completed: number;
  date: string;
}

// Team metrics
export interface TeamMember {
  assignee: string;
  total: number;
  completed: number;
  inProgress: number;
  points: number;
  completedPoints: number;
  completionRate: string;
  pointsCompletionRate: string;
}

// Status distribution
export interface StatusDistribution {
  status: string;
  count: number;
  percentage: string;
}

// Sprint metrics
export interface SprintMetrics {
  totalTasks: number;
  completedTasks: number;
  totalPoints: number;
  completedPoints: number;
  completionRate: string;
  velocity: number;
}

// Form types
export interface NewRetroItemForm {
  type: 'good' | 'improve' | 'action';
  content: string;
  assignedTo: string;
  dueDate: string;
}

// UI state types
export interface ShowAddForm {
  good: boolean;
  improve: boolean;
  action: boolean;
}

export type TimeRange = '7d' | '30d' | '90d';

export interface ReflectionData {
  personalGrowth: ReflectionItem[];
  teamInsights: ReflectionItem[];
  lessonsLearned: ReflectionItem[];
  futureGoals: ReflectionItem[];
  lastUpdated: string | null;
  sprintId: string;
}

export interface ContributorMetrics {
  name: string;
  taskCount: number;
  pointsCompleted: number;
  averageCycleTime: number;
  efficiency: number;
  pointsInProgress: number;
  pointsTotal: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  workload: number;
  velocity: number;
}

export interface VelocityData {
  period: string;
  completed: number;
  planned: number;
  velocity: number;
}

export interface SprintConfig {
  startDate: string;
  endDate: string;
  totalPoints: number;
  workingDays: number[];
  sprintGoal: string;
  velocityTarget: number;
}

export interface BurndownEntry {
  date: string;
  remainingPoints: number;
  completedPoints: number;
  note?: string;
  isManual: boolean;
  updatedBy?: string;
}

export interface BurndownData {
  sprintConfig?: SprintConfig;
  entries: BurndownEntry[];
  lastUpdated: string;
}

export interface NewItemForm {
  type: 'went-well' | 'improve' | 'action';
  content: string;
  assignedTo: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
}

export interface RetroItem {
  id: number;
  type: 'went-well' | 'improve' | 'action';
  content: string;
  author: string;
  createdAt: string;
  votes: number;
  assignedTo?: string;
  dueDate?: string;
  priority: 'Low' | 'Medium' | 'High';
  tags: string[];
}

export interface RetroData {
  items: RetroItem[];
  lastUpdated: string;
  sprintName: string;
  facilitator: string;
  sprintId: string;
}

export interface SprintPlanningData {
  goals: string[];
  features: string[];
  totalStoryPoints: number;
  estimatedWorkingHours: number;
  sprintDuration: number;
  teamCapacity: number;
  sprintStartDate: string;
  sprintEndDate: string;
  sprintObjective: string;
  riskAssessment: string;
  lastUpdated: string;
}

export interface RetroComment {
  id: string;
  text: string;
  author: string;
  authorEmail: string;
  createdAt: string;
  likes: string[]; // Array of user emails who liked this comment
}

export interface EnhancedRetroItem {
  id: number;
  type: 'went-well' | 'improve' | 'action';
  content: string;
  author: string;
  authorEmail: string;
  createdAt: string;
  votes: string[]; // Array of user emails who voted
  assignedTo?: string;
  dueDate?: string;
  priority: 'Low' | 'Medium' | 'High';
  tags: string[];
  comments: RetroComment[];
}

export interface SprintRetroData {
  sprintId: string;
  sprintNumber: number;
  items: EnhancedRetroItem[];
  lastUpdated: string;
  sprintName: string;
  facilitator: string;
}

// Enhanced types for sprint-specific reflection
export interface ReflectionComment {
  id: string;
  text: string;
  author: string;
  authorEmail: string;
  createdAt: string;
  likes: string[]; // Array of user emails who liked this comment
}

export interface EnhancedReflectionItem {
  id: number;
  content: string;
  category: string;
  author: string;
  authorEmail: string;
  createdAt: string;
  tags: string[];
  reviewType: 'self' | 'manager';
  rating?: number;
  comments: ReflectionComment[];
  likes: string[]; // Array of user emails who liked this reflection
}

export interface SprintReflectionData {
  sprintId: string;
  sprintNumber: number;
  personalGrowth: EnhancedReflectionItem[];
  teamInsights: EnhancedReflectionItem[];
  lessonsLearned: EnhancedReflectionItem[];
  futureGoals: EnhancedReflectionItem[];
  lastUpdated: string;
}

// Simplified reflection data structure for user-manager conversations
export interface CategoryReflection {
  userReview?: {
    id: string;
    content: string;
    author: string;
    authorEmail: string;
    createdAt: string;
  };
  managerResponse?: {
    id: string;
    content: string;
    author: string;
    authorEmail: string;
    createdAt: string;
    rating: number; // 1-5 star rating
  };
}

export interface PrivateReflectionData {
  sprintId: string;
  sprintNumber: number;
  userId: string; // The user this reflection belongs to
  userEmail: string;
  userName: string;
  personalGrowth: CategoryReflection;
  teamInsights: CategoryReflection;
  lessonsLearned: CategoryReflection;
  futureGoals: CategoryReflection;
  lastUpdated: string;
  isPrivate: boolean; // Always true for private reflections
}

export interface NewReflectionForm {
  content: string;
  category: string;
  reviewType: 'self' | 'manager';
  rating?: number;
}

export interface NewCategoryReflectionForm {
  content: string;
  category: string;
  rating?: number; // Only for manager responses
}

export type TabKey = 'personal' | 'team' | 'lessons' | 'goals' | 'feedback';

export interface TabConfig {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  description: string;
}

// Enhanced VelocityData with capacity and utilization
export interface EnhancedVelocityData extends VelocityData {
  capacity: number;
  utilization: number;
  trend: number;
}

// Mention types for comments
export interface MentionUser {
  id: string;
  name: string;
  email: string;
}

export interface MentionTask {
  id: string;
  name: string;
}

// Enhanced comment types with mentions
export interface EnhancedRetroComment extends RetroComment {
  mentions?: {
    users: string[];
    tasks: string[];
  };
}

export interface EnhancedReflectionComment extends ReflectionComment {
  mentions?: {
    tasks: string[];
  };
}

// Sprint service methods for enhanced functionality
export interface EnhancedSprintService {
  createSprint(userId: string, boardId: string, sprintData: Omit<Sprint, 'id'>): Promise<Sprint>;
  updateSprint(userId: string, boardId: string, sprintId: string, updates: Partial<Sprint>): Promise<void>;
  deleteSprint(userId: string, boardId: string, sprintId: string): Promise<void>;
  completeActiveSprint(userId: string, boardId: string, sprintId: string): Promise<Sprint>;
  fetchBoardSprints(userId: string, boardId: string): Promise<Sprint[]>;
  assignTasksToSprint(userId: string, boardId: string, sprintId: string, taskIds: string[]): Promise<void>;
}

// Chart data types for analytics
export interface CycleTimeData {
  bucket: string;
  count: number;
  percentage: number;
}

export interface CompletionTrendsData {
  date: string;
  dateFormatted: string;
  created: number;
  completed: number;
  net: number;
  cumulative: number;
}

export interface TeamHealthMetrics {
  velocityTrend: number;
  teamEfficiency: number;
  workloadBalance: number;
  avgCycleTime: number;
  completionRate: number;
}

// Enhanced board type with sprint-specific data
export interface EnhancedBoard extends Board {
  [key: `sprintRetro_${string}`]: SprintRetroData;
  [key: `sprintReflection_${string}`]: SprintReflectionData;
  [key: `privateReflection_${string}_${string}`]: PrivateReflectionData; // privateReflection_sprintId_userId
}

// Props for enhanced components
export interface EnhancedSprintPlanningProps {
  boardId: string;
}

export interface EnhancedAnalyticsProps {
  tasks: Task[];
  board: EnhancedBoard;
}

export interface EnhancedRetrospectiveProps {
  board: EnhancedBoard;
  tasks: Task[];
}

export interface EnhancedReflectionProps {
  board: EnhancedBoard;
  tasks: Task[];
}

// Utility types for form states
export type ViewMode = 'list' | 'create' | 'edit';
export type ChartType = 'velocity' | 'contributors' | 'cycle-time' | 'completion-trends';

// Enhanced mention dropdown props
export interface MentionDropdownProps {
  isOpen: boolean;
  position: { top: number; left: number };
  type: 'users' | 'tasks';
  options: Array<{ id: string; name: string; email?: string }>;
  onSelect: (option: { id: string; name: string }) => void;
  onClose: () => void;
}

// Smart input props for mentions
export interface SmartInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  users?: MentionUser[];
  tasks: MentionTask[];
  className?: string;
  rows?: number;
  isTextarea?: boolean;
}

// Mention state for tracking input
export interface MentionState {
  isOpen: boolean;
  type: 'users' | 'tasks' | null;
  position: { top: number; left: number };
  searchTerm: string;
  startIndex: number;
}

// Enhanced save status type
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Chart configuration type
export interface ChartConfig {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}

// Color configuration for charts
export const CHART_COLORS = {
  primary: '#3B82F6',
  success: '#10B981', 
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  orange: '#F97316',
  lime: '#84CC16'
} as const;

// Sprint status type with enhanced states
export type EnhancedSprintStatus = 'planning' | 'active' | 'completed' | 'cancelled';

// Task priority with story points mapping
export const PRIORITY_POINTS = {
  'Low': 3,
  'Medium': 5,
  'High': 8
} as const;

// Cycle time buckets for analytics
export const CYCLE_TIME_BUCKETS = [
  'â‰¤1 day',
  '2-3 days', 
  '4-7 days',
  '1-2 weeks',
  '>2 weeks'
] as const;

// Health indicator thresholds
export const HEALTH_THRESHOLDS = {
  cycleTime: {
    excellent: 3,
    good: 7
  },
  efficiency: {
    excellent: 80,
    good: 60
  },
  completionRate: {
    excellent: 80,
    good: 60
  }
} as const;