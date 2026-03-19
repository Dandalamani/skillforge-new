import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Course, CreateCourseRequest, UpdateCourseRequest } from '../../shared/models/course.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CourseService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/courses`;

  getAll(): Observable<Course[]> {
    return this.http.get<{ courses: Course[] }>(this.base).pipe(map(r => r.courses));
  }

  getById(id: number): Observable<Course> {
    return this.http.get<{ course: Course }>(`${this.base}/${id}`).pipe(map(r => r.course));
  }

  create(data: CreateCourseRequest): Observable<Course> {
    return this.http.post<{ course: Course }>(this.base, data).pipe(map(r => r.course));
  }

  update(id: number, data: UpdateCourseRequest): Observable<Course> {
    return this.http.put<{ course: Course }>(`${this.base}/${id}`, data).pipe(map(r => r.course));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  publish(id: number): Observable<Course> {
    return this.update(id, { status: 'PUBLISHED' });
  }

  unpublish(id: number): Observable<Course> {
    return this.update(id, { status: 'DRAFT' });
  }
}