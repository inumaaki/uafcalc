import type { Subject } from "@/types/result";

// Helper Interface for internal logic since we use Subject/CourseRow differently
interface ScrapedCourse {
    semester: string;
    course_code: string;
    total: string | number; // marks
    teacher_name?: string;
}

/**
 * Get semester type order: Winter=1, Spring=2, Summer=3
 * Academic year starts with Winter and ends with Summer
 */
function getSemesterTypeOrder(semester: string): number {
    const lower = semester?.toLowerCase() || '';
    if (lower.includes('winter')) return 1;
    if (lower.includes('spring')) return 2;
    if (lower.includes('summer')) return 3;
    return 0;
}

/**
 * Parse academic year from semester string
 * Handles formats like "2022-2023", "2024-25", "2025-26"
 */
function parseAcademicYear(semester: string): { startYear: number; endYear: number } {
    const match = semester?.match(/(\d{4})[-/](\d{2,4})/);
    if (match) {
        const startYear = parseInt(match[1]);
        let endYear = parseInt(match[2]);
        // Handle 2-digit year format (e.g., "24-25" -> 2024-2025)
        if (endYear < 100) {
            endYear = Math.floor(startYear / 100) * 100 + endYear;
        }
        return { startYear, endYear };
    }
    return { startYear: 0, endYear: 0 };
}

/**
 * Compare two semesters for sorting (chronological order: oldest first)
 */
export function compareSemesters(sem1: string, sem2: string): number {
    const year1 = parseAcademicYear(sem1);
    const year2 = parseAcademicYear(sem2);

    if (year1.startYear !== year2.startYear) {
        return year1.startYear - year2.startYear;
    }

    const type1 = getSemesterTypeOrder(sem1);
    const type2 = getSemesterTypeOrder(sem2);
    return type1 - type2;
}

/**
 * Get sorted semesters in chronological order (oldest first)
 */
export function getSortedSemestersChronological(semesters: string[]): string[] {
    const uniqueSemesters = [...new Set(semesters)];
    return uniqueSemesters.sort(compareSemesters);
}

/**
 * Determine the semester number (1, 2, 3...) based on chronological order
 */
export function getSemesterMap(allSemesters: string[]): Record<string, number> {
    const sorted = getSortedSemestersChronological(allSemesters);
    const map: Record<string, number> = {};
    sorted.forEach((sem, index) => {
        map[sem] = index + 1;
    });
    return map;
}

/**
 * Normalize semester name to standard format "Type Semester YYYY-YYYY"
 * Handles legacy codes (e.g. "winter25") and various input formats.
 */
export function normalizeSemesterName(sem: string): string {
    const lower = sem.toLowerCase();
    let type = '';

    if (lower.includes('winter')) type = 'Winter Semester';
    else if (lower.includes('spring')) type = 'Spring Semester';
    else if (lower.includes('summer')) type = 'Summer Semester';
    else return sem; // Can't identify type

    // 1. LMS Format: "2024-2025" or "2024/2025"
    const rangeMatch = sem.match(/(\d{4})[-/](\d{2,4})/);
    if (rangeMatch) {
        const startYear = parseInt(rangeMatch[1]);
        let endYear = parseInt(rangeMatch[2]);
        if (endYear < 100) endYear = Math.floor(startYear / 100) * 100 + endYear;
        return `${type} ${startYear}-${endYear}`;
    }

    // 2. Legacy Format: "winter25" -> Ends in 2025, Starts in 2024
    // Legacy code typically refers to the End Year of the session (Exam Year)
    const shortMatch = lower.match(/[a-z]+[\s-]*(\d{2})$/);
    if (shortMatch) {
        const endYearShort = parseInt(shortMatch[1]);
        const endYear = 2000 + endYearShort;
        const startYear = endYear - 1;
        return `${type} ${startYear}-${endYear}`;
    }

    // 3. Single Year Fallback: "Winter 2024"
    // Assume it is the Start Year
    const yearMatch = sem.match(/(\d{4})/);
    if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        return `${type} ${year}-${year + 1}`;
    }

    return sem;
}
