
import { Subject, SemesterResult } from "@/types/result";

// Helper to determine GP from marks and credits based on UAF rules
import { gradingScale } from "@/config/semesterMap";

export function getGradePoint(grade: string): number {
  return gradingScale[grade.toUpperCase()] ?? 0;
}

export function calculateCourseGP(marks: number, creditHours: number): number {
  if (!creditHours || isNaN(marks)) return 0;
  if (calculateGradeLetter(marks, creditHours) === 'F') return 0;

  let maxGradePoints = 0;
  let minGradePoints = 0;
  let marksForMaxGP = 0;
  let marksForMinGP = 0;

  if (creditHours >= 1 && creditHours <= 5) {
    maxGradePoints = creditHours * 4;
    minGradePoints = creditHours;
    marksForMaxGP = creditHours * 16;
    marksForMinGP = creditHours * 8;
  } else {
    return 0;
  }

  if (marks >= marksForMaxGP) {
    return maxGradePoints;
  } else if (marks >= marksForMinGP) {
    const totalGap = marksForMaxGP - marks;

    // Explicit D Grade Logic from Reference
    const dGradeMarks = marksForMinGP + creditHours * 2;
    if (marks <= dGradeMarks) {
      const gap = marks - marksForMinGP;
      const grades = minGradePoints + (gap * 0.5);
      return grades;
    } else {
      // Deduction Logic
      let totalDeduction = 0;
      for (let i = 0; i < totalGap; i++) {
        const position = i % 3;
        if (position === 0) totalDeduction += 0.33;
        else if (position === 1) totalDeduction += 0.34;
        else totalDeduction += 0.33;
      }
      // Return fixed precision number
      const gp = maxGradePoints - totalDeduction;
      return Number(gp.toFixed(2));
    }
  } else {
    return minGradePoints;
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
    const code = subject.code?.trim().toUpperCase();
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
