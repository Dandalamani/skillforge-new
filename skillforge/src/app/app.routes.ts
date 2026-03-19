import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
  { path: 'auth', children: [
    { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
    { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
  ]},
  { path: 'dashboard', canActivate: [authGuard], children: [
    { path: 'student', canActivate: [roleGuard], data: { roles: ['STUDENT'] }, loadComponent: () => import('./features/dashboard/student/student-dashboard.component').then(m => m.StudentDashboardComponent) },
    { path: 'instructor', canActivate: [roleGuard], data: { roles: ['INSTRUCTOR'] }, loadComponent: () => import('./features/dashboard/instructor/instructor-dashboard.component').then(m => m.InstructorDashboardComponent) },
    { path: 'admin', canActivate: [roleGuard], data: { roles: ['ADMIN'] }, loadComponent: () => import('./features/dashboard/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
  ]},
  // Student pages
  { path: 'student/courses', canActivate: [authGuard, roleGuard], data: { roles: ['STUDENT'] }, loadComponent: () => import('./features/student/student-courses/student-courses.component').then(m => m.StudentCoursesComponent) },
  { path: 'student/quizzes', canActivate: [authGuard, roleGuard], data: { roles: ['STUDENT'] }, loadComponent: () => import('./features/student/student-quizzes/student-quizzes.component').then(m => m.StudentQuizzesComponent) },
  { path: 'student/progress', canActivate: [authGuard, roleGuard], data: { roles: ['STUDENT'] }, loadComponent: () => import('./features/student/student-progress/student-progress.component').then(m => m.StudentProgressComponent) },
  { path: 'student/profile', canActivate: [authGuard, roleGuard], data: { roles: ['STUDENT'] }, loadComponent: () => import('./features/student/student-profile/student-profile.component').then(m => m.StudentProfileComponent) },
  { path: 'student/ai-tutor', canActivate: [authGuard, roleGuard], data: { roles: ['STUDENT'] }, loadComponent: () => import('./features/student/ai-tutor/ai-tutor.component').then(m => m.AiTutorComponent) },
  // Instructor pages
  { path: 'courses', canActivate: [authGuard, roleGuard], data: { roles: ['INSTRUCTOR', 'ADMIN'] }, children: [
    { path: '', loadComponent: () => import('./features/courses/course-list/course-list.component').then(m => m.CourseListComponent) },
    { path: 'new', loadComponent: () => import('./features/courses/course-form/course-form.component').then(m => m.CourseFormComponent) },
    { path: ':id/edit', loadComponent: () => import('./features/courses/course-form/course-form.component').then(m => m.CourseFormComponent) },
    { path: ':id/content', loadComponent: () => import('./features/courses/course-content/course-content.component').then(m => m.CourseContentComponent) },
  ]},
  { path: 'quiz-generator', canActivate: [authGuard, roleGuard], data: { roles: ['INSTRUCTOR', 'ADMIN'] }, loadComponent: () => import('./features/quiz/quiz-generator/quiz-generator.component').then(m => m.QuizGeneratorComponent) },
  { path: 'students', canActivate: [authGuard, roleGuard], data: { roles: ['INSTRUCTOR', 'ADMIN'] }, loadComponent: () => import('./features/students/students.component').then(m => m.StudentsComponent) },
  { path: 'analytics', canActivate: [authGuard, roleGuard], data: { roles: ['INSTRUCTOR', 'ADMIN'] }, loadComponent: () => import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent) },
  // Admin pages
  { path: 'admin/users', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN'] }, loadComponent: () => import('./features/admin/admin-users/admin-users.component').then(m => m.AdminUsersComponent) },
  { path: 'admin/courses', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN'] }, loadComponent: () => import('./features/admin/admin-courses/admin-courses.component').then(m => m.AdminCoursesComponent) },
  { path: 'admin/ai-logs', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN'] }, loadComponent: () => import('./features/admin/admin-ai-logs/admin-ai-logs.component').then(m => m.AdminAiLogsComponent) },
  { path: 'admin/reports', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN'] }, loadComponent: () => import('./features/admin/admin-reports/admin-reports.component').then(m => m.AdminReportsComponent) },
  { path: '**', redirectTo: '/auth/login' },
];