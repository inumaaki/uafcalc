
import { Subject, SemesterResult } from "@/types/result";

// Helper to determine GP from marks and credits based on UAF rules
import { gradingScale } from "@/config/semesterMap";

export function getGradePoint(grade: string): number {
  return gradingScale[grade.toUpperCase()] ?? 0;
}

export function calculateCourseGP(marks: number, creditHours: number): number {
  if (!creditHours || isNaN(marks)) return 0;
  if (marks < 0) return 0;

  // Calculate percentage based on 20 marks per credit hour rule
  const maxMarks = creditHours * 20;
  const percentage = (marks / maxMarks) * 100;

  let gpa = 0;

  if (percentage >= 80) {
    gpa = 4.0;
  } else if (percentage >= 50) {
    // Linear 2.0 to 4.0 over 30% range
    gpa = 2.0 + (percentage - 50) * (2.0 / 30);
  } else if (percentage >= 40) {
    // Linear 1.0 to 2.0 over 10% range
    gpa = 1.0 + (percentage - 40) * (1.0 / 10);
  } else {
    return 0;
  }

  // Calculate Quality Points (QP)
  // The Excel sheet shows QP rounded to 2 decimal places (e.g. 11.33)
  const qp = gpa * creditHours;

  // Return rounded QP to 2 decimal places as per system convention
  return Number(qp.toFixed(2));
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
    // Rely on calculated gradePoints
    totalGradePoints += subject.gradePoints;
    totalCreditHours += subject.creditHours;
  });

  if (totalCreditHours === 0) return 0;
  return Number((totalGradePoints / totalCreditHours).toFixed(2));
}

// Logic to keep best attempt for repeated courses
export function filterBestAttempts(subjects: Subject[]): Subject[] {
  const courseMap = new Map<string, Subject>();

  subjects.forEach(subject => {
    // Normalize code to uppercase/trimmed
    // Normalize code: remove non-alphanumeric, uppercase
    const code = subject.code?.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (!code) return; // Skip if no code

    const existing = courseMap.get(code);
    if (!existing) {
      courseMap.set(code, subject);
    } else {
      const currentMarks = subject.marks || 0;
      const existingMarks = existing.marks || 0;

      if (currentMarks > existingMarks) {
        // Current is better, replace existing
        // Mark as improved? The UI might want to know.
        // We can append (Improved) to the name if not present
        const newName = subject.name.includes('(Improved)') ? subject.name : `${subject.name} (Improved)`;
        courseMap.set(code, { ...subject, name: newName });
      } else {
        // Existing is better or equal, keep it. 
        // But maybe existing needs (Improved) tag if it was a repeat? 
        // Hard to know which one came later without semester info here.
        // But usually we just want the highest marks.
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
