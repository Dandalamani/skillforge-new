import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

interface StudentCourse {
  id: number; title: string; description: string; difficulty: string;
  instructor: string; quizCount: number; attempted: number;
  contentCount: number; createdAt: string;
}
interface ContentItem {
  id: number; title: string; type: 'VIDEO' | 'PDF' | 'LINK';
  url: string; file_name?: string; file_size?: number; description?: string;
}
interface CourseDetail {
  id: number; title: string; description: string; difficulty_level: string;
  instructor: { name: string };
}

@Component({
  selector: 'app-student-courses',
  standalone: true,
  imports: [CommonModule, UpperCasePipe],
  templateUrl: './student-courses.component.html',
  styleUrl: './student-courses.component.scss',
})
export class StudentCoursesComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private http = inject(HttpClient);
  authService = inject(AuthService);

  user = this.authService.currentUser;
  showProfile = signal(false);

  firstName = computed(() => {
    const name = this.user()?.name;
    return name ? name.split(' ')[0] : '';
  });

  memberSince = computed(() => {
    const user = this.user() as any;
    if (!user?.createdAt) return 'N/A';
    return new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  courses = signal<StudentCourse[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  startedCourses = signal<Set<number>>(new Set());

  viewingCourse = signal<CourseDetail | null>(null);
  contents = signal<ContentItem[]>([]);
  isLoadingContent = signal(false);
  activeContent = signal<ContentItem | null>(null);
  currentIndex = signal(0);

  private clickOutside = (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    if (!t.closest('.profile-dropdown') && !t.closest('.avatar-circle')) {
      this.showProfile.set(false);
    }
  };

  ngOnInit(): void {
    const stored = localStorage.getItem('startedCourses');
    if (stored) this.startedCourses.set(new Set(JSON.parse(stored)));
    this.loadCourses();
    document.addEventListener('click', this.clickOutside);
  }

  ngOnDestroy(): void { document.removeEventListener('click', this.clickOutside); }

  loadCourses(): void {
    this.http.get<{ courses: StudentCourse[] }>(`${environment.apiUrl}/student/courses`).subscribe({
      next: r => { this.courses.set(r.courses); this.isLoading.set(false); },
      error: () => { this.errorMessage.set('Failed to load courses.'); this.isLoading.set(false); },
    });
  }

  toggleProfile(): void { this.showProfile.update(v => !v); }
  isStarted(courseId: number): boolean { return this.startedCourses().has(courseId); }

  startCourse(course: StudentCourse): void {
    this.http.post(`${environment.apiUrl}/student/courses/${course.id}/start`, {}).subscribe();
    const updated = new Set(this.startedCourses());
    updated.add(course.id);
    this.startedCourses.set(updated);
    localStorage.setItem('startedCourses', JSON.stringify([...updated]));
    this.openCourse(course.id);
  }

  openCourse(courseId: number): void {
    this.isLoadingContent.set(true);
    this.activeContent.set(null);
    this.currentIndex.set(0);
    this.http.get<{ course: CourseDetail; contents: ContentItem[] }>(
      `${environment.apiUrl}/student/courses/${courseId}/content`
    ).subscribe({
      next: r => {
        this.viewingCourse.set(r.course);
        this.contents.set(r.contents);
        this.isLoadingContent.set(false);
        if (r.contents.length > 0) { this.activeContent.set(r.contents[0]); this.currentIndex.set(0); }
      },
      error: () => this.isLoadingContent.set(false),
    });
  }

  closeViewer(): void { this.viewingCourse.set(null); this.contents.set([]); this.activeContent.set(null); this.currentIndex.set(0); }
  selectContent(item: ContentItem): void { const idx = this.contents().findIndex(c => c.id === item.id); this.currentIndex.set(idx); this.activeContent.set(item); }
  hasPrev(): boolean { return this.currentIndex() > 0; }
  hasNext(): boolean { return this.currentIndex() < this.contents().length - 1; }
  prevContent(): void { const idx = this.currentIndex() - 1; if (idx >= 0) { this.currentIndex.set(idx); this.activeContent.set(this.contents()[idx]); } }
  nextContent(): void { const idx = this.currentIndex() + 1; if (idx < this.contents().length) { this.currentIndex.set(idx); this.activeContent.set(this.contents()[idx]); } }
  onContentComplete(): void { if (this.hasNext()) setTimeout(() => this.nextContent(), 1000); }
  getViewerProgress(): number { if (!this.contents().length) return 0; return Math.round(((this.currentIndex() + 1) / this.contents().length) * 100); }
  byType(type: string): ContentItem[] { return this.contents().filter(c => c.type === type); }
  getFileUrl(url: string): string { return url.startsWith('http') ? url : `http://localhost:3000${url}`; }
  isVideo(item: ContentItem): boolean { return item.type === 'VIDEO'; }
  isPdf(item: ContentItem): boolean { return item.type === 'PDF'; }
  isLink(item: ContentItem): boolean { return item.type === 'LINK'; }
  getDifficultyClass(d: string): string { return d?.toLowerCase() ?? ''; }
  navigate(path: string): void { this.showProfile.set(false); this.router.navigate([path]); }
  logout(): void { this.authService.logout(); }
}