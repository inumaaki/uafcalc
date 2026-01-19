import axios from 'axios';
import * as cheerio from 'cheerio';
import type { StudentResult, Subject, SemesterResult } from '@/types/result';
import { calculateGPA, calculateCGPA, getGradePoint, calculateCourseGP } from './gpaCalculator';
import { compareSemesters } from './course-utils';

const CONFIG = {
    // Use local proxy path
    LOGIN_URL: "/api/uaf/login/index.php",
    RESULT_URL: "/api/uaf/course/uaf_student_result.php",
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    AXIOS_TIMEOUT: 30000,
};

interface CourseRow {
    sr: string;
    semester: string;
    teacher_name: string;
    course_code: string;
    course_title: string;
    credit_hours: string;
    mid: string;
    assignment: string;
    final: string;
    practical: string;
    total: string;
    grade: string;
}

export class UAFScraper {
    private async submitFormAndGetResult(regNumber: string): Promise<string> {
        try {
            // 1. Get Login Page to fetch Token
            const loginPageResponse = await axios.get(CONFIG.LOGIN_URL, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            const tokenMatch = loginPageResponse.data.match(/document\.getElementById\(['"]token['"]\)\.value\s*=\s*['"]([^'"]+)['"]/);
            const token = tokenMatch ? tokenMatch[1] : '';

            if (!token) {
                throw new Error('Failed to extract authentication token from LMS');
            }

            // 2. Post Data to Result URL
            const formData = new URLSearchParams();
            formData.append('Register', regNumber);
            formData.append('token', token);

            const resultResponse = await axios.post(CONFIG.RESULT_URL, formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                timeout: CONFIG.AXIOS_TIMEOUT,
            });

            const html = resultResponse.data;

            if (typeof html !== 'string' || html.length < 100) {
                throw new Error('Invalid response received from LMS');
            }

            if (!html.includes('table class="table tab-content"')) {
                // This usually means the result doesn't exist or layout changed
                throw new Error('Result not found or session expired');
            }

            return html;

        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Network error: ${error.message}`);
            }
            throw error;
        }
    }

    public async getResult(regNumber: string): Promise<StudentResult> {
        let retries = 0;
        let lastError: Error | null = null;

        while (retries < CONFIG.MAX_RETRIES) {
            try {
                const html = await this.submitFormAndGetResult(regNumber);

                const $ = cheerio.load(html);
                const info = this.extractStudentInfo($);
                const { results } = this.extractResultData($);

                if (results.length === 0) {
                    throw new Error('No result data found for this student');
                }

                return this.processResultData(info, results);

            } catch (error) {
                lastError = error as Error;
                retries++;
                if (retries < CONFIG.MAX_RETRIES) {
                    await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY));
                }
            }
        }

        throw lastError || new Error('Failed to fetch results after maximum retries');
    }

    private extractStudentInfo($: cheerio.CheerioAPI) {
        let name = '';
        let registrationNo = '';
        let program = '';

        $('table.table.tab-content').first().find('tr').each((_, row) => {
            const cols = $(row).find('td');
            if (cols.length === 2) {
                const key = $(cols[0]).text().trim().toLowerCase();
                const value = $(cols[1]).text().trim();

                if (key.includes('name')) name = value;
                else if (key.includes('registration')) registrationNo = value;
                else if (key.includes('degree')) program = value;
            }
        });

        if (!name || !registrationNo) {
            // Fallback or error? Let's be lenient
            if (registrationNo) return { name: "Student", registrationNo, program };
            throw new Error("Could not parse student information");
        }

        return { name, registrationNo, program };
    }

    private extractResultData($: cheerio.CheerioAPI): { headers: string[], results: CourseRow[] } {
        const headers: string[] = [];
        const results: CourseRow[] = [];
        const resultTable = $('table.table.tab-content').last();

        // Parse headers
        resultTable.find('tr:first-child th').each((_, th) => {
            headers.push($(th).text().trim().toLowerCase().replace(/\s+/g, '_'));
        });

        // We rely on fixed indices mostly, but good to have headers
        // 0: Sr. 1: Semester 2: Teacher 3: Code 4: Title 5: Cr 6: Mid 7: Ass 8: Final 9: Prac 10: Total 11: Grade

        resultTable.find('tr:gt(0)').each((_, row) => {
            const cols = $(row).find('td');
            if (cols.length >= 12) { // Ensure enough columns
                results.push({
                    sr: $(cols[0]).text().trim(),
                    semester: $(cols[1]).text().trim(),
                    teacher_name: $(cols[2]).text().trim(),
                    course_code: $(cols[3]).text().trim(),
                    course_title: $(cols[4]).text().trim(),
                    credit_hours: $(cols[5]).text().trim(),
                    mid: $(cols[6]).text().trim(),
                    assignment: $(cols[7]).text().trim(),
                    final: $(cols[8]).text().trim(),
                    practical: $(cols[9]).text().trim(),
                    total: $(cols[10]).text().trim(),
                    grade: $(cols[11]).text().trim(),
                });
            }
        });

        return { headers, results };
    }

    private processResultData(info: { name: string, registrationNo: string, program: string }, rows: CourseRow[]): StudentResult {
        // Group by semester
        const semestersMap = new Map<string, Subject[]>();

        rows.forEach(row => {
            const semKey = row.semester;
            if (!semestersMap.has(semKey)) {
                semestersMap.set(semKey, []);
            }


            const creditHours = parseInt(row.credit_hours) || 0;
            const marks = parseInt(row.total) || 0;
            const grade = row.grade;

            // Calculate Total GP for the course
            // Try precise calculation from marks first, else fallback to grade letter * credits
            let gradePoints = calculateCourseGP(marks, creditHours);
            if (gradePoints === 0 && grade !== 'F' && marks === 0) {
                // Fallback if marks are missing but grade is present
                gradePoints = getGradePoint(grade) * creditHours;
            }

            const subject: Subject = {
                name: row.course_title,
                code: row.course_code,
                creditHours: creditHours,
                fullCreditHours: row.credit_hours,
                marks: marks,
                mid: parseInt(row.mid) || 0,
                assignment: parseInt(row.assignment) || 0,
                final: parseInt(row.final) || 0,
                practical: parseInt(row.practical) || 0,
                grade: grade,
                gradePoints: gradePoints // Now storing TOTAL GP
            };

            semestersMap.get(semKey)?.push(subject);
        });

        const semesters: SemesterResult[] = [];

        // Sort semesters chronologically
        const sortedSemesterNames = Array.from(semestersMap.keys()).sort(compareSemesters);

        sortedSemesterNames.forEach((semName, index) => {
            const subjects = semestersMap.get(semName) || [];

            // Calculate GPA using centralized logic
            const gpa = calculateGPA(subjects);

            const totalCreditHours = subjects.reduce((sum, s) => sum + s.creditHours, 0);
            // Sum gradePoints directly since they are now Total GP
            const totalGradePoints = subjects.reduce((sum, s) => sum + s.gradePoints, 0);

            semesters.push({
                semester: semName,
                semesterNumber: index + 1, // 1-based index from sorted array
                subjects: subjects,
                gpa: gpa,
                totalCreditHours,
                totalGradePoints: totalGradePoints
            });
        });

        // Reverse to show latest semester first (7th, 6th, ... 1st)
        semesters.reverse();

        const cgpa = calculateCGPA(semesters);
        const totalCreditHours = semesters.reduce((sum, s) => sum + s.totalCreditHours, 0);

        return {
            name: info.name,
            registrationNo: info.registrationNo,
            program: info.program,
            semesters,
            cgpa,
            totalCreditHours,
            status: 'success'
        };
    }
}

export const uafScraper = new UAFScraper();
