import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

type ContentType = 'VIDEO' | 'PDF' | 'LINK';
interface Content {
  id: number; title: string; type: ContentType;
  url: string; file_name?: string; file_size?: number;
  description?: string; order_index: number; createdAt: string;
}

@Component({
  selector: 'app-course-content',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent, DatePipe],
  templateUrl: './course-content.component.html',
  styleUrl: './course-content.component.scss',
})
export class CourseContentComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  authService = inject(AuthService);

  courseId = signal<number>(0);
  courseName = signal('');
  contents = signal<Content[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  activeTab = signal<'video' | 'pdf' | 'link'>('video');

  uploadProgress = signal<number | null>(null);
  uploadError = signal('');
  uploadSuccess = signal('');
  isUploading = signal(false);

  linkForm = this.fb.group({
    title: ['', Validators.required],
    url: ['', [Validators.required, Validators.pattern('https?://.+')]],
    description: [''],
  });
  linkSuccess = signal('');
  linkError = signal('');
  isAddingLink = signal(false);

  selectedFile = signal<File | null>(null);
  uploadTitle = signal('');
  uploadDesc = signal('');

  showDialog = signal(false);
  dialogTitle = signal('');
  dialogMessage = signal('');
  pendingDeleteId = signal<number | null>(null);

  get titleControl(): FormControl { return this.linkForm.controls.title as FormControl; }
  get urlControl(): FormControl { return this.linkForm.controls.url as FormControl; }
  get descControl(): FormControl { return this.linkForm.controls.description as FormControl; }

  get apiBase(): string { return `${environment.apiUrl}/courses/${this.courseId()}/contents`; }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.courseId.set(id);
    this.loadContents();
    this.http.get<{ course: { title: string } }>(`${environment.apiUrl}/courses/${id}`).subscribe({
      next: r => this.courseName.set(r.course.title),
    });
  }

  loadContents(): void {
    this.isLoading.set(true);
    this.http.get<{ contents: Content[] }>(this.apiBase).subscribe({
      next: r => { this.contents.set(r.contents); this.isLoading.set(false); },
      error: () => { this.errorMessage.set('Failed to load content.'); this.isLoading.set(false); },
    });
  }

  setTab(tab: 'video' | 'pdf' | 'link'): void {
    this.activeTab.set(tab);
    this.selectedFile.set(null);
    this.uploadTitle.set('');
    this.uploadDesc.set('');
    this.uploadError.set('');
    this.uploadSuccess.set('');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.selectedFile.set(file);
    if (!this.uploadTitle()) this.uploadTitle.set(file.name.replace(/\.[^/.]+$/, ''));
    this.uploadError.set('');
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    this.selectedFile.set(file);
    if (!this.uploadTitle()) this.uploadTitle.set(file.name.replace(/\.[^/.]+$/, ''));
    this.uploadError.set('');
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  clearFile(): void {
    this.selectedFile.set(null);
  }

  setUploadTitle(value: string): void { this.uploadTitle.set(value); }
  setUploadDesc(value: string): void { this.uploadDesc.set(value); }

  uploadFile(): void {
    const file = this.selectedFile();
    if (!file || !this.uploadTitle()) {
      this.uploadError.set('Please select a file and enter a title.');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', this.uploadTitle());
    formData.append('description', this.uploadDesc());

    this.isUploading.set(true);
    this.uploadProgress.set(0);
    this.uploadError.set('');
    this.uploadSuccess.set('');

    this.http.post<{ content: Content }>(`${this.apiBase}/upload`, formData, {
      reportProgress: true, observe: 'events',
    }).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress.set(Math.round((event.loaded / event.total) * 100));
        } else if (event.type === HttpEventType.Response) {
          const c = (event.body as any).content;
          this.contents.update(list => [...list, c]);
          this.uploadSuccess.set(`"${c.title}" uploaded successfully!`);
          this.selectedFile.set(null);
          this.uploadTitle.set('');
          this.uploadDesc.set('');
          this.uploadProgress.set(null);
          this.isUploading.set(false);
        }
      },
      error: (err) => {
        this.uploadError.set(err.error?.message || 'Upload failed.');
        this.uploadProgress.set(null);
        this.isUploading.set(false);
      },
    });
  }

  addLink(): void {
    if (this.linkForm.invalid) { this.linkForm.markAllAsTouched(); return; }
    this.isAddingLink.set(true);
    this.linkError.set('');
    this.linkSuccess.set('');
    this.http.post<{ content: Content }>(`${this.apiBase}/link`, this.linkForm.value).subscribe({
      next: r => {
        this.contents.update(list => [...list, r.content]);
        this.linkSuccess.set(`Link "${r.content.title}" added!`);
        this.linkForm.reset();
        this.isAddingLink.set(false);
      },
      error: err => { this.linkError.set(err.error?.message || 'Failed to add link.'); this.isAddingLink.set(false); },
    });
  }

  confirmDelete(c: Content): void {
    this.pendingDeleteId.set(c.id);
    this.dialogTitle.set('Delete Content');
    this.dialogMessage.set(`"${c.title}" will be permanently removed.`);
    this.showDialog.set(true);
  }

  onDeleteConfirmed(): void {
    const id = this.pendingDeleteId();
    this.showDialog.set(false);
    if (!id) return;
    this.http.delete(`${this.apiBase}/${id}`).subscribe({
      next: () => this.contents.update(list => list.filter(c => c.id !== id)),
    });
    this.pendingDeleteId.set(null);
  }

  formatSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  byType(type: ContentType): Content[] {
    return this.contents().filter(c => c.type === type);
  }

  getFileUrl(url: string): string {
    return `http://localhost:3000${url}`;
  }

  navigate(path: string): void { this.router.navigate([path]); }
  logout(): void { this.authService.logout(); }
  closeDialog(): void { this.showDialog.set(false); }
}