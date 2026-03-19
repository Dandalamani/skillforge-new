export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type CourseStatus = 'DRAFT' | 'PUBLISHED';

export interface Course {
  id: number;
  title: string;
  description: string;
  instructor_id: number;
  difficulty_level: DifficultyLevel;
  status: CourseStatus;
  thumbnail_url?: string;
  instructor?: { id: number; name: string; email: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCourseRequest {
  title: string;
  description: string;
  difficulty_level: DifficultyLevel;
}

export interface UpdateCourseRequest extends Partial<CreateCourseRequest> {
  status?: CourseStatus;
}