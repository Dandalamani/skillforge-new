import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';
import { DifficultyLevel } from '../../../shared/models/course.model';

@Component({
  selector: 'app-course-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './course-form.component.html',
  styleUrl: './course-form.component.scss',
})
export class CourseFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private courseService = inject(CourseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoading = signal(false);
  isFetching = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  courseId = signal<number | null>(null);

  difficulties: DifficultyLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
    difficulty_level: ['BEGINNER' as DifficultyLevel, Validators.required],
  });

  get title(): AbstractControl { return this.form.get('title')!; }
  get description(): AbstractControl { return this.form.get('description')!; }
  get difficulty_level(): AbstractControl { return this.form.get('difficulty_level')!; }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.courseId.set(Number(id));
      this.loadCourse(Number(id));
    }
  }

  loadCourse(id: number): void {
    this.isFetching.set(true);
    this.courseService.getById(id).subscribe({
      next: (course) => {
        this.form.patchValue({
          title: course.title,
          description: course.description,
          difficulty_level: course.difficulty_level,
        });
        this.isFetching.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load course.');
        this.isFetching.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const payload = this.form.value as {
      title: string;
      description: string;
      difficulty_level: DifficultyLevel;
    };

    const action = this.isEditMode()
      ? this.courseService.update(this.courseId()!, payload)
      : this.courseService.create(payload);

    action.subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/courses']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Failed to save course.');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/courses']);
  }
}