export interface Subject {
  name: string;
  code?: string;
  creditHours: number;
  fullCreditHours?: string;
  marks?: number;
  mid?: number;
  assignment?: number;
  final?: number;
  practical?: number;
  grade: string;
  gradePoints: number;
}

export interface SemesterResult {
  semester: string;
  semesterNumber: number;
  subjects: Subject[];
  gpa: number;
  totalCreditHours: number;
  totalGradePoints: number;
}

export interface StudentResult {
  name: string;
  registrationNo: string;
  program?: string;
  semesters: SemesterResult[];
  cgpa: number;
  totalCreditHours: number;
  status: 'success' | 'error' | 'loading';
  error?: string;
}

export interface AGNumber {
  year: string;
  prefix: string;
  number: string;
}
