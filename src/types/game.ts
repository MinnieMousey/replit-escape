export type TaskType =
  | 'FLIGHT_PLAN'
  | 'NOTAM'
  | 'PIB'
  | 'PILOT_CALL'
  | 'COVER_PAGE'
  | 'AIS_HANDLING'
  | 'METAR'
  | 'ATS_MESSAGE'
  | 'INFO_REQUEST'
  | 'RFFS_CALL'
  | 'FPL_ROUTING'
  | 'FPL_APPROVAL'
  | 'FPL_COMPARE';

export type Urgency     = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Difficulty  = 'EASY' | 'MEDIUM' | 'HARD';
export type TaskStatus  = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'EXPIRED';

export interface AISTask {
  id: string;
  scenarioId: string;
  type: TaskType;
  urgency: Urgency;
  difficulty: Difficulty;
  status: TaskStatus;
  title: string;
  description: string;
  scenario: any;
  correctAnswer: any;
  expiresAt: number;
  createdAt: number;
  completedAt?: number;
  score?: number;
  maxScore: number;
  feedback?: string;
}
