// types/index.ts
export interface User {
  uid: string;
  email: string;
  displayName?: string | null;
}

export interface Collaborator {
  name: string;
  email: string;
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
  createdAt: any;
  retroData?: RetroData;
  reflectionData?: ReflectionData;
}


export interface ProgressLogEntry {
  desc: string;
  type: 'created' | 'status-change' | 'assignment-change' | 'description-change' | 
        'dueDate-change' | 'tags-change' | 'file-upload' | 'child-task-added' | 'priority-change' | 'title-change' |
        'child-task-deleted' | 'task-updated' | 'child-task-updated' | 'child-task-status-changed';
  to?: string;
  timestamp: any;
  user: string;
}

export interface Comment {
  text: string;
  timestamp: any;
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
  tags: string[];
  assignedTo: string;
  createdAt: any;
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
}

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

// Retrospective types
export interface RetroItem {
  id: number;
  type: 'good' | 'improve' | 'action';
  content: string;
  author: string;
  createdAt: string;
  votes: number;
  assignedTo?: string;
  dueDate?: string;
}

export interface RetroData {
  items: RetroItem[];
  lastUpdated: string;
  sprint: string;
}

// Reflection types
export interface ReflectionItem {
  id: number;
  content: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  author: string;
  createdAt: string;
  tags: string[];
}

export interface ReflectionData {
  personalReflections: ReflectionItem[];
  teamInsights: ReflectionItem[];
  lessonsLearned: ReflectionItem[];
  futureGoals: ReflectionItem[];
  lastUpdated: string | null;
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

export interface NewReflectionForm {
  content: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
}

// UI state types
export interface ShowAddForm {
  good: boolean;
  improve: boolean;
  action: boolean;
}

export type TabKey = 'personal' | 'team' | 'lessons' | 'goals';
export type TimeRange = '7d' | '30d' | '90d';

export interface TabConfig {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}

// types/index.ts - Add these interfaces to your existing types file

// Add these new interfaces for analytics data
export interface RetroItem {
  id: number;
  type: 'good' | 'improve' | 'action';
  content: string;
  author: string;
  createdAt: string;
  votes: number;
  assignedTo?: string;
  dueDate?: string;
}

export interface RetroData {
  items: RetroItem[];
  lastUpdated: string;
  sprint: string;
}

export interface ReflectionItem {
  id: number;
  content: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  author: string;
  createdAt: string;
  tags: string[];
}

export interface ReflectionData {
  personalReflections: ReflectionItem[];
  teamInsights: ReflectionItem[];
  lessonsLearned: ReflectionItem[];
  futureGoals: ReflectionItem[];
  lastUpdated: string | null;
}
