import axios from 'axios';
import * as cheerio from 'cheerio';
import type { StudentResult, Subject, SemesterResult } from '@/types/result';
import { calculateGPA, calculateCGPA, getGradePoint, calculateCourseGP, filterBestAttempts } from './gpaCalculator';
import { compareSemesters, normalizeSemesterName } from './course-utils';

const CONFIG = {
    // Use local proxy path
    LOGIN_URL: "/api/uaf/login/index.php",
    RESULT_URL: "/api/uaf/course/uaf_student_result.php",
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    AXIOS_TIMEOUT: 30000,
    LEGACY_URL: "/api/legacy/",
    LEGACY_DEFAULT: "/api/legacy/default.aspx",
    LEGACY_DETAIL: "/api/legacy/StudentDetail.aspx",
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
    private async getLegacyCourses(regNumber: string): Promise<CourseRow[]> {
        try {
            // 1. Initial GET to fetch ViewState
            const initialResponse = await axios.get(CONFIG.LEGACY_URL, {
                headers: { 'Cache-Control': 'no-cache' }
            });

            const $ = cheerio.load(initialResponse.data);
            const viewstate = $('#__VIEWSTATE').val();
            const eventValidation = $('#__EVENTVALIDATION').val();
            const viewstateGenerator = $('#__VIEWSTATEGENERATOR').val();

            if (!viewstate || !eventValidation) {
                console.warn('Failed to extract ViewState from legacy portal');
                return [];
            }

            // 2. POST to Default
            const formData = new URLSearchParams();
            formData.append('__VIEWSTATE', viewstate as string);
            formData.append('__VIEWSTATEGENERATOR', viewstateGenerator as string || '');
            formData.append('__EVENTVALIDATION', eventValidation as string);
            formData.append('ctl00$Main$txtReg', regNumber);
            formData.append('ctl00$Main$btnShow', 'Show');

            // Note: We need to handle cookies manually in browser if not handled by proxy automatically?
            // The proxy configuration `proxyRes` handles cookie attributes (SameSite), so browser should attach them automatically for subsequent requests 
            // to the same domain (which is local /api/legacy).

            await axios.post(CONFIG.LEGACY_DEFAULT, formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            // 3. GET Detail
            const detailResponse = await axios.get(CONFIG.LEGACY_DETAIL);

            // 4. Parse
            const $detail = cheerio.load(detailResponse.data);
            const courses: CourseRow[] = [];

            const resultTable = $detail('#ctl00_Main_TabContainer1_tbResultInformation_gvResultInformation');

            const cleanMarkValue = (value: string): string => {
                return value.endsWith('.00') ? value.substring(0, value.length - 3) : value;
            };

            resultTable.find('tr:gt(0)').each((index, row) => {
                const cols = $detail(row).find('td');
                if (cols.length > 0) {
                    // Columns based on reference implementation
                    // 0: Sr, 1: ?, 2: ?, 3: Semester, 4: Teacher, 5: Course Code, 6: Title, 7: ?, 8: Mid, 9: Ass, 10: Fin, 11: Prac, 12: Tot, 13: Grd
                    const semester = $detail(cols[3]).text().trim();
                    const courseCode = $detail(cols[5]).text().trim();
                    const teacherName = $detail(cols[4]).text().trim();
                    const courseName = $detail(cols[6]).text().trim();

                    // Marks
                    const mid = cleanMarkValue($detail(cols[8]).text().trim());
                    const assignment = cleanMarkValue($detail(cols[9]).text().trim());
                    const final = cleanMarkValue($detail(cols[10]).text().trim());
                    const practical = cleanMarkValue($detail(cols[11]).text().trim());
                    const total = cleanMarkValue($detail(cols[12]).text().trim());
                    const grade = $detail(cols[13]).text().trim();

                    // Basic validation
                    if (courseCode && semester) {
                        courses.push({
                            sr: (index + 1).toString(),
                            semester,
                            teacher_name: teacherName || 'N/A',
                            course_code: courseCode,
                            course_title: courseName || courseCode,
                            credit_hours: '3', // Defaulting to 3 as legacy portal doesn't provide it reliably in this view
                            mid, assignment, final, practical, total, grade
                        });
                    }
                }
            });

            return courses;

        } catch (e) {
            console.warn("Legacy fetch failed", e);
            return []; // Fail silently for secondary source
        }
    }

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
                // If token fails, maybe try legacy? But we need Student Info from LMS.
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

    public async getResult(regNumber: string, includeLegacy: boolean = true): Promise<StudentResult> {
        let retries = 0;
        let lastError: Error | null = null;

        while (retries < CONFIG.MAX_RETRIES) {
            try {
                // Fetch both sources in parallel (conditionally fetch legacy)
                const [lmsResult, legacyCourses] = await Promise.all([
                    this.submitFormAndGetResult(regNumber),
                    includeLegacy ? this.getLegacyCourses(regNumber) : Promise.resolve([])
                ]);

                const $ = cheerio.load(lmsResult);
                const info = this.extractStudentInfo($);
                const { results: lmsCourses } = this.extractResultData($);

                // Merge Logic:
                // 1. Create a map of LMS courses
                const courseMap = new Map<string, CourseRow>();

                lmsCourses.forEach(c => {
                    // Update to normalized semester
                    c.semester = normalizeSemesterName(c.semester);
                    courseMap.set(`${c.course_code}-${c.semester}`, c);
                });

                // 2. Add Legacy courses if not present
                legacyCourses.forEach(c => {
                    // Update to normalized semester
                    c.semester = normalizeSemesterName(c.semester);

                    const key = `${c.course_code}-${c.semester}`;
                    if (!courseMap.has(key)) {
                        courseMap.set(key, c);
                    }
                });

                const mergedResults = Array.from(courseMap.values());

                if (mergedResults.length === 0) {
                    throw new Error('No result data found for this student');
                }

                return this.processResultData(info, mergedResults);

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
        // 1. Convert ALL rows to Subject objects first
        const allSubjects: (Subject & { semester: string })[] = rows.map(row => {
            const creditHours = parseInt(row.credit_hours) || 0;
            const marks = parseInt(row.total) || 0;
            const grade = row.grade;

            // Calculate Total GP using the new strict logic
            let gradePoints = calculateCourseGP(marks, creditHours);

            return {
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
                gradePoints: gradePoints,
                semester: row.semester // Keep track of semester for grouping later
            };
        });

        // 2. Filter to keep ONLY the best attempts
        const bestSubjects = filterBestAttempts(allSubjects) as (Subject & { semester: string })[];

        // 3. Group by semester
        const semestersMap = new Map<string, Subject[]>();

        bestSubjects.forEach(sub => {
            const semKey = sub.semester;
            if (!semestersMap.has(semKey)) {
                semestersMap.set(semKey, []);
            }
            semestersMap.get(semKey)?.push(sub);
        });

        const semesters: SemesterResult[] = [];
        const sortedSemesterNames = Array.from(semestersMap.keys()).sort(compareSemesters);

        let regularSemesterCount = 0;

        sortedSemesterNames.forEach((semName) => {
            const subjects = semestersMap.get(semName) || [];
            const isSummer = semName.toLowerCase().includes('summer');

            if (!isSummer) {
                regularSemesterCount++;
            }

            const gpa = calculateGPA(subjects);
            const totalCreditHours = subjects.reduce((sum, s) => sum + s.creditHours, 0);
            const totalGradePoints = subjects.reduce((sum, s) => sum + s.gradePoints, 0);

            semesters.push({
                semester: semName,
                semesterNumber: isSummer ? 0 : regularSemesterCount,
                subjects: subjects,
                gpa: gpa,
                totalCreditHours,
                totalGradePoints: totalGradePoints
            });
        });

        // Reverse to show latest semester first
        semesters.reverse();

        // Calculate CGPA
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

    public async getBatchResults(
        agNumbers: string[],
        onProgress: (progress: number, result?: StudentResult) => void
    ): Promise<StudentResult[]> {
        const results: StudentResult[] = [];
        let completed = 0;

        // Helper to update progress safely
        const updateProgress = (result?: StudentResult) => {
            if (result) results.push(result);
            // Don't double count, calculate based on total target
            // onProgress((completed / agNumbers.length) * 100, result);
        };

        // Generic processor for a list of AGs with specific concurrency
        const processPhase = async (items: string[], concurrency: number): Promise<string[]> => {
            const failed: string[] = [];

            for (let i = 0; i < items.length; i += concurrency) {
                const chunk = items.slice(i, i + concurrency);
                await Promise.all(chunk.map(async (ag) => {
                    try {
                        const result = await this.getResult(ag, false);
                        completed++;
                        updateProgress(result);
                        onProgress((completed / agNumbers.length) * 100, result);
                    } catch (error) {
                        failed.push(ag);
                        // Do NOT increment 'completed' yet if we plan to retry
                        // But wait, if we retry, we need to adjust the denominator?
                        // Simpler: Just don't update progress for failures yet.
                    }
                }));
                // Delay between chunks
                if (items.length > concurrency) await new Promise(r => setTimeout(r, 100)); // Optimized delay
            }
            return failed;
        };

        // Phase 1: High Speed (Concurrency 30)
        let failedItems = await processPhase(agNumbers, 30);

        // Phase 2: Moderate Retry (Concurrency 5)
        if (failedItems.length > 0) {
            console.log(`Phase 2: Retrying ${failedItems.length} items...`);
            failedItems = await processPhase(failedItems, 5);
        }

        // Phase 3: Sequential Last Resort (Concurrency 1)
        if (failedItems.length > 0) {
            console.log(`Phase 3: Sequential retry for ${failedItems.length} items...`);
            for (const ag of failedItems) {
                try {
                    const result = await this.getResult(ag, false);
                    completed++;
                    updateProgress(result);
                    onProgress((completed / agNumbers.length) * 100, result);
                } catch (error) {
                    console.error(`Final failure for ${ag}:`, error);
                    // Mark as completed (but failed)
                    completed++;
                    onProgress((completed / agNumbers.length) * 100);
                }
            }
        }

        return results;
    }
}

export const uafScraper = new UAFScraper();
