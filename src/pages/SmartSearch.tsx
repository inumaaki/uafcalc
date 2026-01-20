import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Download, Filter, BookOpen, XCircle } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { AGNumberInput } from "@/components/ui/AGNumberInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateAGRange, parseAGNumber } from "@/lib/gpaCalculator";
import type { StudentResult, Subject } from "@/types/result";
import { uafScraper } from "@/lib/uaf-scraper";
import { StudentDetailModal } from "@/components/results/StudentDetailModal";
import { cn } from "@/lib/utils";

export default function SmartSearch() {
    const [startAG, setStartAG] = useState({ year: "", number: "" });
    const [endAG, setEndAG] = useState({ year: "", number: "" });
    const [courseFilter, setCourseFilter] = useState("");
    const [gradeFilter, setGradeFilter] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<StudentResult[]>([]);
    const [progress, setProgress] = useState(0);
    const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);

    const handleFetch = async () => {
        if (!startAG.year || !startAG.number || !endAG.year || !endAG.number) return;

        setLoading(true);
        setProgress(0);
        setResults([]);
        setGradeFilter(null); // Reset filter on new search

        const startNum = parseInt(startAG.number);
        const endNum = parseInt(endAG.number);
        const agList = generateAGRange(startAG.year, startNum, startAG.year, endNum);

        await uafScraper.getBatchResults(agList, (prog, result) => {
            setProgress(prog);
            if (result) {
                setResults(prev => {
                    const newResults = [...prev, result];
                    return newResults.sort((a, b) => {
                        const agA = parseAGNumber(a.registrationNo);
                        const agB = parseAGNumber(b.registrationNo);
                        if (!agA || !agB) return 0;
                        if (agA.year !== agB.year) return parseInt(agA.year) - parseInt(agB.year);
                        return parseInt(agA.number) - parseInt(agB.number);
                    });
                });
            }
        });

        setLoading(false);
    };

    const isRangeValid =
        startAG.year.length === 4 &&
        startAG.number.length >= 1 &&
        endAG.year.length === 4 &&
        endAG.number.length >= 1;

    // 1. Filter by Course
    const courseFilteredResults = useMemo(() => {
        return results.map(student => {
            if (!courseFilter) return { student, match: null };

            const filterLower = courseFilter.toLowerCase();
            let foundSubject: Subject | null = null;

            // Search all semesters
            for (const sem of student.semesters) {
                const match = sem.subjects.find(sub =>
                    sub.name.toLowerCase().includes(filterLower) ||
                    sub.code.toLowerCase().includes(filterLower)
                );
                if (match) {
                    foundSubject = match;
                    break;
                }
            }
            return foundSubject ? { student, match: foundSubject } : null;
        }).filter(item => item !== null) as { student: StudentResult, match: Subject | null }[];
    }, [results, courseFilter]);

    // 2. Compute Stats (based on course filtered results)
    const stats = useMemo(() => {
        if (!courseFilter) return null;
        const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        courseFilteredResults.forEach(({ match }) => {
            if (match) {
                // Normalize grade (remove +/-, map P to null or ignore?)
                // Assuming standard grades A, B, C, D, F.
                // If grade is "A+" treat as "A"? Or keep discrete? 
                // Let's use the first letter for grouping (Simple A, B, C..) or exact matches?
                // User asked for "A, B, C, D, F".
                const grade = match.grade.charAt(0).toUpperCase();
                if (counts[grade] !== undefined) counts[grade]++;
            }
        });
        return counts;
    }, [courseFilteredResults, courseFilter]);

    // 3. Filter by Grade
    const displayData = useMemo(() => {
        if (!gradeFilter) return courseFilteredResults;
        return courseFilteredResults.filter(({ match }) => {
            if (!match) return false;
            // Match first letter to cover A+, A- etc if they exist, or exact match?
            // The stats grouped by first letter, so filter should too.
            return match.grade.charAt(0).toUpperCase() === gradeFilter;
        });
    }, [courseFilteredResults, gradeFilter]);

    const exportCSV = () => {
        if (displayData.length === 0) return;

        const headers = ["Name", "Registration No", "CGPA", ...(courseFilter ? ["Course", "Marks", "Grade", "GP"] : [])];
        const rows = displayData.map(({ student, match }) => {
            const base = [student.name, student.registrationNo, student.cgpa.toFixed(2)];
            if (match) {
                base.push(match.name, match.marks.toString(), match.grade, match.gradePoints.toString());
            }
            return base;
        });

        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "smart_search_results.csv";
        a.click();
    };

    return (
        <Layout>
            <div className="max-w-6xl mx-auto min-h-[81vh] flex flex-col justify-center">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                        <Filter className="h-7 w-7" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                        Smart Search
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Analyze specific courses across a batch of students. Filter by course name or code to see comparable performance.
                    </p>
                </motion.div>

                {/* Controls Card */}
                <Card className="mb-8 border-primary/20 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <Search className="h-5 w-5" />
                            Search Criteria
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Range Inputs */}
                        <div className="flex flex-col md:flex-row items-center md:items-end justify-center gap-4">
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-medium text-muted-foreground">Start AG</span>
                                <AGNumberInput value={startAG} onChange={setStartAG} onEnter={handleFetch} className="w-[290px] md:w-auto" />
                            </div>
                            <div className="h-11 flex items-center justify-center hidden md:flex">
                                <span className="text-2xl font-bold text-muted-foreground pb-1">→</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-medium text-muted-foreground">End AG</span>
                                <AGNumberInput value={endAG} onChange={setEndAG} onEnter={handleFetch} className="w-[290px] md:w-auto" />
                            </div>
                        </div>

                        {/* Course Filter */}
                        <div className="max-w-md mx-auto relative">
                            <div className="absolute left-3 top-3 text-muted-foreground">
                                <BookOpen className="h-4 w-4" />
                            </div>
                            <Input
                                placeholder="Filter by Course (e.g., 'CSC-101' or 'Database')"
                                value={courseFilter}
                                onChange={(e) => {
                                    setCourseFilter(e.target.value);
                                    setGradeFilter(null); // Reset grade filter when course changes
                                }}
                                onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                                className="pl-9 h-11 border-primary/30 focus-visible:ring-primary"
                            />
                            <p className="text-xs text-muted-foreground mt-1.5 text-center">
                                Leave empty to see all results, or type to filter specific subjects.
                            </p>
                        </div>

                        <div className="flex flex-col items-center gap-4 pt-2">
                            <Button
                                size="lg"
                                onClick={handleFetch}
                                disabled={!isRangeValid || loading}
                                className="w-[200px] font-bold shadow-lg shadow-primary/20"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Scanning...
                                    </>
                                ) : (
                                    <>
                                        <Search className="h-4 w-4 mr-2" />
                                        Run Smart Search
                                    </>
                                )}
                            </Button>

                            {/* Progress Bar (MOVED INSIDE CARD for single page fit) */}
                            <AnimatePresence>
                                {loading && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="w-full max-w-md px-4"
                                    >
                                        <div className="bg-muted rounded-full h-2 overflow-hidden">
                                            <motion.div
                                                className="bg-primary h-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        </div>
                                        <p className="text-sm text-muted-foreground text-center mt-2">
                                            Processing... {Math.round(progress)}%
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Bar (Only if Course Filter is active and we have results) */}
                <AnimatePresence>
                    {courseFilter && !loading && courseFilteredResults.length > 0 && stats && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
                        >
                            {Object.entries(stats).map(([grade, count]) => (
                                <div
                                    key={grade}
                                    onClick={() => setGradeFilter(gradeFilter === grade ? null : grade)}
                                    className={cn(
                                        "bg-card border-l-4 rounded-r-md p-3 shadow-sm cursor-pointer transition-all hover:translate-y-[-2px]",
                                        grade === 'A' ? "border-l-emerald-500" :
                                            grade === 'B' ? "border-l-blue-500" :
                                                grade === 'C' ? "border-l-yellow-500" :
                                                    grade === 'D' ? "border-l-orange-500" :
                                                        "border-l-red-500",
                                        gradeFilter === grade ? "ring-2 ring-primary ring-offset-2" : "hover:bg-muted/50"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-lg">{grade}</span>
                                        <Badge variant="outline" className="font-mono">{count}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Students</p>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Results */}
                <AnimatePresence>
                    {(!loading && results.length > 0) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                Analysis Results
                                                {gradeFilter && (
                                                    <Badge className="bg-primary text-primary-foreground">
                                                        Waitlist: {gradeFilter}
                                                        <XCircle
                                                            className="ml-1 h-3 w-3 cursor-pointer"
                                                            onClick={(e) => { e.stopPropagation(); setGradeFilter(null); }}
                                                        />
                                                    </Badge>
                                                )}
                                            </CardTitle>
                                            <CardDescription>
                                                Found {courseFilteredResults.length} matches
                                                {gradeFilter && ` (${displayData.length} shown)`}
                                            </CardDescription>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={exportCSV}>
                                            <Download className="h-4 w-4 mr-2" />
                                            Export CSV
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>#</TableHead>
                                                    <TableHead>Registration</TableHead>
                                                    <TableHead>Name</TableHead>
                                                    {courseFilter ? (
                                                        <>
                                                            <TableHead className="text-center font-bold text-primary">Course</TableHead>
                                                            <TableHead className="text-center">Marks</TableHead>
                                                            <TableHead className="text-center">Grade</TableHead>
                                                        </>
                                                    ) : (
                                                        <TableHead className="text-center">CGPA</TableHead>
                                                    )}
                                                    <TableHead className="w-10"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {displayData.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                            No matches found for this filter.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (displayData.map(({ student, match }, index) => (
                                                    <TableRow key={student.registrationNo} className="hover:bg-muted/50">
                                                        <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                                                        <TableCell className="font-mono">{student.registrationNo}</TableCell>
                                                        <TableCell>{student.name}</TableCell>

                                                        {courseFilter && match ? (
                                                            <>
                                                                <TableCell className="text-center text-xs font-bold text-primary max-w-[150px] truncate" title={match.name}>
                                                                    {match.name}
                                                                </TableCell>
                                                                <TableCell className="text-center font-mono">{match.marks}</TableCell>
                                                                <TableCell className="text-center">
                                                                    <Badge variant="secondary" className="font-bold">
                                                                        {match.grade}
                                                                    </Badge>
                                                                </TableCell>
                                                            </>
                                                        ) : (
                                                            <TableCell className="text-center font-bold text-primary">
                                                                {student.cgpa.toFixed(2)}
                                                            </TableCell>
                                                        )}

                                                        <TableCell>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setSelectedStudent(student)}
                                                            >
                                                                <Search className="h-4 w-4 text-muted-foreground" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                )))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                <StudentDetailModal
                    isOpen={!!selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                    student={selectedStudent}
                />
            </div>
        </Layout>
    );
}
