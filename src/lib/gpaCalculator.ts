
import { Subject, SemesterResult } from "@/types/result";

// Helper to determine GP from marks and credits based on UAF rules
import { gradingScale } from "@/config/semesterMap";

export function getGradePoint(grade: string): number {
  return gradingScale[grade.toUpperCase()] ?? 0;
}

export function calculateCourseGP(marks: number, creditHours: number): number {
  if (!creditHours || isNaN(marks)) return 0;

  // Basic strict fail check (below 40% usually, or based on the logic: marks < creditHours * 8)
  // Logic from external: marksForMinGP = creditHours * 8. If totalMarks < marksForMaxGP but >= marksForMinGP...
  // So if marks < creditHours * 8, it returns 0?
  // External code: 
  // if (totalMarks >= marksForMaxGP) return max
  // else if (totalMarks >= marksForMinGP) { ... }
  // else { return minGradePoints } -> Wait, minGradePoints is creditHours * 1?
  // Actually, checking the external file again:
  // line 47: return minGradePoints.
  // line 18: minGradePoints = creditHours.
  // This implies if you have 1 mark, you get 1.0 GP (for 1 credit)? That seems wrong for UAF.
  // Usually < 8 marks per credit (40%) is F (0 GP).
  // However, the external code had: if (course.grade === 'F') return 0; at the top.
  // Since we are calculating from marks, we must define the Fail threshold.
  // UAF rule: Pass marks is usually 40%.
  // 40% of (20 * credits) = 8 * credits.
  // So if marks < 8 * creditHours, convert to F (0 GP).

  const minPassingMarks = creditHours * 8;
  if (marks < minPassingMarks) return 0;

  const maxGradePoints = creditHours * 4;
  const minGradePoints = creditHours; // 1.0 GPA per credit?
  const marksForMaxGP = creditHours * 16; // 80%
  const marksForMinGP = creditHours * 8;  // 40%

  if (marks >= marksForMaxGP) {
    return maxGradePoints;
  } else if (marks >= marksForMinGP) {
    // Logic for marks between 40% and 80%
    const totalGap = marksForMaxGP - marks;

    // External logic has a weird specific branch:
    // if (totalMarks <= dGradeMarks) { ... }
    // dGradeMarks = marksForMinGP + creditHours * 2 (i.e. 40% + 10% = 50%)
    const dGradeMarks = marksForMinGP + creditHours * 2;

    if (marks <= dGradeMarks) {
      // D grade logic (40-50%)
      const gap = marks - marksForMinGP;
      const grades = minGradePoints + (gap * 0.5);
      return grades;
    } else {
      // Normal deduction logic (>50%)
      let totalDeduction = 0;
      for (let i = 0; i < totalGap; i++) {
        const position = i % 3;
        if (position === 0) totalDeduction += 0.33;
        else if (position === 1) totalDeduction += 0.34;
        else totalDeduction += 0.33;
      }
      return maxGradePoints - totalDeduction;
    }
  }

  return 0;
}

// Helper to determine Grade Letter from marks (Approximate based on UAF usually)
export function calculateGradeLetter(marks: number, creditHours: number): string {
  const percentage = (marks / (creditHours * 20)) * 100;
  if (percentage >= 80) return "A";
  if (percentage >= 65) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

export function calculateGPA(subjects: Subject[]): number {
  if (subjects.length === 0) return 0;

  let totalGradePoints = 0;
  let totalCreditHours = 0;

  subjects.forEach((subject) => {
    // Use existing gradePoints if available and valid, otherwise calculate
    // Actually, for consistency, if we trust the scraper's marks, we could recalculate.
    // But scraper scrapes the GP directly from the result card, which is the source of truth.
    // If subject.gradePoints is 0 and marks > 0, maybe we should calculate?
    // For now, trust subject.gradePoints if it exists, else calculate.

    const gp = subject.gradePoints;
    // Note: subject.gradePoints is usually the total GP for the course (e.g. 12).
    // calculateCourseGP returns total GP for the course.

    totalGradePoints += gp;
    totalCreditHours += subject.creditHours;
  });

  if (totalCreditHours === 0) return 0;
  // GPA = Total GP / Total Credits
  return Number((totalGradePoints / totalCreditHours).toFixed(2));
}

// Logic to keep best attempt for repeated courses
export function filterBestAttempts(subjects: Subject[]): Subject[] {
  const courseMap = new Map<string, Subject>();

  subjects.forEach(subject => {
    // Normalize code to uppercase/trimmed
    const code = subject.code?.trim().toUpperCase();
    if (!code) return; // Skip if no code

    const existing = courseMap.get(code);
    if (!existing) {
      courseMap.set(code, subject);
    } else {
      // Compare marks (assuming marks are populated). If marks missing, use gradePoints?
      // Marks are better source.
      const currentMarks = subject.marks || 0;
      const existingMarks = existing.marks || 0;

      if (currentMarks > existingMarks) {
        courseMap.set(code, subject);
      } else if (currentMarks === existingMarks) {
        // If marks equal, maybe take latest? (Not tracking date easily here, keep existing)
      }
    }
  });

  return Array.from(courseMap.values());
}

export function calculateCGPA(semesters: SemesterResult[]): number {
  if (semesters.length === 0) return 0;

  // Flatten all subjects
  const allSubjects = semesters.flatMap(s => s.subjects);

  // Filter best attempts
  const uniqueSubjects = filterBestAttempts(allSubjects);

  let totalGradePoints = 0;
  let totalCreditHours = 0;

  uniqueSubjects.forEach((subject) => {
    totalGradePoints += subject.gradePoints;
    totalCreditHours += subject.creditHours;
  });

  if (totalCreditHours === 0) return 0;
  return Number((totalGradePoints / totalCreditHours).toFixed(2));
}


export function getGPAStatus(gpa: number): {
  label: string;
  color: string;
} {
  if (gpa >= 3.7) return { label: "Excellent", color: "text-success" };
  if (gpa >= 3.0) return { label: "Good", color: "text-primary" };
  if (gpa >= 2.0) return { label: "Satisfactory", color: "text-warning" };
  return { label: "Needs Improvement", color: "text-destructive" };
}

export function formatAGNumber(year: string, number: string): string {
  return `${year}-ag-${number}`;
}

export function parseAGNumber(ag: string): { year: string; number: string } | null {
  const match = ag.match(/^(\d{4})-ag-(\d+)$/i);
  if (!match) return null;
  return { year: match[1], number: match[2] };
}

export function generateAGRange(
  startYear: string,
  startNum: number,
  endYear: string,
  endNum: number
): string[] {
  const agNumbers: string[] = [];

  if (startYear === endYear) {
    for (let i = startNum; i <= endNum; i++) {
      agNumbers.push(formatAGNumber(startYear, i.toString()));
    }
  }

  return agNumbers;
}
