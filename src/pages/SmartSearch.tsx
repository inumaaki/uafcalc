import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Download, Filter, BookOpen, XCircle, Info, Upload, ArrowRightLeft, Users } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { AGNumberInput } from "@/components/ui/AGNumberInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateAGRange, parseAGNumber } from "@/lib/gpaCalculator";
import type { StudentResult, Subject } from "@/types/result";
import { uafScraper } from "@/lib/uaf-scraper";
import { CourseDetailModal } from "@/components/results/CourseDetailModal";
import { AGReviewDialog } from "@/components/results/AGReviewDialog";
import * as XLSX from 'xlsx';
import { cn } from "@/lib/utils";

export default function SmartSearch() {
    const [startAG, setStartAG] = useState({ year: "", number: "" });
    const [endAG, setEndAG] = useState({ year: "", number: "" });
    const [courseFilter, setCourseFilter] = useState("");
    const [gradeFilter, setGradeFilter] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<StudentResult[]>([]);
    const [progress, setProgress] = useState(0);
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [pendingAGs, setPendingAGs] = useState<string[]>([]);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [activeTab, setActiveTab] = useState("range");

    const handleFetch = async () => {
        if (!courseFilter) {
            alert("Please enter a subject name to filter by (e.g., 'Database').");
            return;
        }
        if (!startAG.year || !startAG.number || !endAG.year || !endAG.number) return;

        setHasSearched(true);
        setLoading(true);
        setProgress(0);
        setResults([]);
        setGradeFilter(null);

        const startNum = parseInt(startAG.number);
        const endNum = parseInt(endAG.number);
        const agList = generateAGRange(startAG.year, startNum, startAG.year, endNum);

        const filterLower = courseFilter.toLowerCase();

        await uafScraper.getBatchResults(agList, (prog, result) => {
            setProgress(prog);
            if (result) {
                // strict content filtering
                let matchFound = false;
                const filteredSemesters = result.semesters.map(sem => {
                    const matchedSubjects = sem.subjects.filter(sub =>
                        sub.name.toLowerCase().includes(filterLower) ||
                        sub.code.toLowerCase().includes(filterLower)
                    );
                    if (matchedSubjects.length > 0) matchFound = true;
                    return { ...sem, subjects: matchedSubjects };
                }).filter(sem => sem.subjects.length > 0);

                if (matchFound) {
                    const filteredResult = { ...result, semesters: filteredSemesters };
                    setResults(prev => {
                        const newResults = [...prev, filteredResult];
                        return newResults.sort((a, b) => {
                            const agA = parseAGNumber(a.registrationNo);
                            const agB = parseAGNumber(b.registrationNo);
                            if (!agA || !agB) return 0;
                            if (agA.year !== agB.year) return parseInt(agA.year) - parseInt(agB.year);
                            return parseInt(agA.number) - parseInt(agB.number);
                        });
                    });
                }
            }
        });

        setLoading(false);
    };

    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!courseFilter) {
            alert("Please enter a subject name to filter by (e.g., 'Database') before uploading.");
            e.target.value = '';
            return;
        }
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
                const agRegex = /\b\d{4}-ag-\d+\b/gi;
                const foundAGs: string[] = [];

                rows.forEach(row => {
                    row.forEach(cell => {
                        if (typeof cell === 'string') {
                            const matches = cell.match(agRegex);
                            if (matches) {
                                matches.forEach(m => foundAGs.push(m.toLowerCase()));
                            }
                        }
                    });
                });

                const uniqueAGs = Array.from(new Set(foundAGs));

                if (uniqueAGs.length > 0) {
                    setPendingAGs(uniqueAGs);
                    setIsReviewOpen(true);
                } else {
                    alert("No valid AG numbers (format: YYYY-ag-XXXX) found in the file.");
                }
            } catch (error) {
                console.error("Error parsing Excel:", error);
            }
            e.target.value = '';
        };
        reader.readAsArrayBuffer(file);
    };

    const handleExcelFetch = async (excelAGs: string[]) => {
        setHasSearched(true);
        setLoading(true);
        setProgress(0);
        setResults([]);
        setGradeFilter(null);

        const filterLower = courseFilter.toLowerCase();

        await uafScraper.getBatchResults(excelAGs, (prog, result) => {
            setProgress(prog);
            if (result) {
                // strict content filtering
                let matchFound = false;
                const filteredSemesters = result.semesters.map(sem => {
                    const matchedSubjects = sem.subjects.filter(sub =>
                        sub.name.toLowerCase().includes(filterLower) ||
                        sub.code.toLowerCase().includes(filterLower)
                    );
                    if (matchedSubjects.length > 0) matchFound = true;
                    return { ...sem, subjects: matchedSubjects };
                }).filter(sem => sem.subjects.length > 0);

                if (matchFound) {
                    const filteredResult = { ...result, semesters: filteredSemesters };
                    setResults(prev => {
                        const newResults = [...prev, filteredResult];
                        return newResults.sort((a, b) => {
                            const agA = parseAGNumber(a.registrationNo);
                            const agB = parseAGNumber(b.registrationNo);
                            if (!agA || !agB) return 0;
                            if (agA.year !== agB.year) return parseInt(agA.year) - parseInt(agB.year);
                            return parseInt(agA.number) - parseInt(agB.number);
                        });
                    });
                }
            }
        });

        setLoading(false);
    }

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

    // 2. Compute Stats
    const stats = useMemo(() => {
        if (!courseFilter) return null;
        const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        courseFilteredResults.forEach(({ match }) => {
            if (match) {
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
            return match.grade.charAt(0).toUpperCase() === gradeFilter;
        });
    }, [courseFilteredResults, gradeFilter]);

    const exportCSV = () => {
        if (displayData.length === 0) return;

        const headers = ["Name", "Registration No", "CGPA", ...(courseFilter ? ["Marks", "Grade", "GP"] : [])];
        const rows = displayData.map(({ student, match }) => {
            const base = [student.name, student.registrationNo, student.cgpa.toFixed(2)];
            if (match) {
                base.push(match.marks.toString(), match.grade, match.gradePoints.toString());
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
            <div className={cn(
                "flex flex-col items-center justify-center p-2 lg:p-4 overflow-hidden transition-all duration-500 ease-in-out",
                hasSearched ? "h-[calc(100vh-theme(spacing.2))] lg:h-[calc(100vh-theme(spacing.20))]" : "min-h-[85vh]"
            )}>

                <motion.div
                    layout
                    className={cn(
                        "w-full mx-auto flex gap-4 h-full transition-all duration-500",
                        hasSearched ? "max-w-7xl flex-col lg:flex-row" : "max-w-md md:max-w-2xl flex-col justify-center"
                    )}
                >

                    {/* LEFT PANEL: Controls */}
                    <motion.div
                        layout
                        className={cn(
                            "w-full shrink-0 flex flex-col gap-4 overflow-auto lg:overflow-visible transition-all duration-500",
                            hasSearched ? "lg:w-[400px] xl:w-[450px] pr-1" : "w-full"
                        )}
                    >

                        {/* Header */}
                        <div className={cn("text-center", hasSearched ? "lg:text-left" : "mb-4")}>
                            {!hasSearched && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3"
                                >
                                    <Filter className="h-6 w-6" />
                                </motion.div>
                            )}
                            <h1 className={cn("font-bold flex items-center justify-center gap-2", hasSearched ? "text-2xl lg:justify-start" : "text-2xl")}>
                                {hasSearched && (
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Filter className="h-6 w-6" />
                                    </div>
                                )}
                                Smart Search
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                                Analyze specific courses across a batch of students.
                            </p>
                        </div>

                        {/* Main Controls Card */}
                        <Card className={cn("border-primary/20 shadow-md transition-all", hasSearched ? "" : "shadow-xl border-primary/30")}>
                            {!hasSearched && (
                                <CardHeader className="text-center pb-2 pt-4">
                                    <CardTitle className="font-semibold tracking-tight text-xl">
                                        Search Parameters
                                    </CardTitle>
                                    <CardDescription>
                                        Enter AG range or upload Excel to start.
                                    </CardDescription>
                                </CardHeader>
                            )}
                            {hasSearched && (
                                <CardHeader className="pb-3 pt-4">
                                    <CardTitle className="text-lg flex items-center gap-2 text-primary">
                                        <Search className="h-4 w-4" />
                                        Parameters
                                    </CardTitle>
                                </CardHeader>
                            )}

                            <CardContent className="space-y-3 pb-4 pt-2">
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <TabsList className={cn("grid w-full mb-6 bg-muted/40 p-1.5 rounded-xl border border-border/50", hasSearched ? "h-12 grid-cols-2" : "h-12 max-w-sm mx-auto grid-cols-2")}>
                                        <TabsTrigger value="range" className={cn("gap-2", hasSearched ? "text-xs" : "text-sm")}>
                                            <ArrowRightLeft className="h-4 w-4" />
                                            AG Range
                                        </TabsTrigger>
                                        <TabsTrigger value="excel" className={cn("gap-2", hasSearched ? "text-xs" : "text-sm")}>
                                            <Download className="h-4 w-4" />
                                            Excel Upload
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="range" className="mt-0 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Start AG</Label>
                                                <AGNumberInput value={startAG} onChange={setStartAG} onEnter={handleFetch} className={cn("h-9", !hasSearched && "h-10 text-base w-full max-w-[290px] md:w-auto")} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">End AG</Label>
                                                <AGNumberInput value={endAG} onChange={setEndAG} onEnter={handleFetch} className={cn("h-9", !hasSearched && "h-10 text-base w-full max-w-[290px] md:w-auto")} />
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="excel" className="mt-0">
                                        <Label
                                            htmlFor="excel-upload"
                                            className={cn(
                                                "flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors border-primary/20",
                                                hasSearched ? "h-24" : "h-28"
                                            )}
                                        >
                                            <Upload className={cn("text-muted-foreground", hasSearched ? "w-6 h-6 mb-2" : "w-8 h-8 mb-2")} />
                                            <span className="text-xs text-muted-foreground font-semibold">Click to upload .xlsx/.csv</span>
                                            <Input id="excel-upload" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} disabled={loading} />
                                        </Label>
                                    </TabsContent>
                                </Tabs>

                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                                        <Label className="text-xs font-semibold">Filter Subject</Label>
                                    </div>
                                    <Input
                                        placeholder="e.g. 'Database'"
                                        value={courseFilter}
                                        onChange={(e) => {
                                            setCourseFilter(e.target.value);
                                            setGradeFilter(null);
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && activeTab === 'range' && handleFetch()}
                                        className={cn("text-sm", hasSearched ? "h-9" : "h-10")}
                                    />
                                    <p className="text-[10px] text-muted-foreground">Type subject name to analyze grades.</p>
                                </div>

                                {activeTab === 'range' && (
                                    <Button
                                        size={hasSearched ? "sm" : "default"}
                                        onClick={handleFetch}
                                        disabled={!isRangeValid || loading || !courseFilter}
                                        className={cn("w-full font-bold h-9", !hasSearched && "mt-1")}
                                    >
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                                        {loading ? "Scanning..." : "Fetch Results"}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* Progress Panel (Compact) */}
                        <AnimatePresence>
                            {loading && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-card border rounded-md p-3 shadow-sm"
                                >
                                    <div className="flex justify-between text-sm font-medium mb-2">
                                        <span>Processing...</span>
                                        <span className="font-mono">{Math.round(progress)}%</span>
                                    </div>
                                    <div className="bg-muted rounded-full h-3 overflow-hidden">
                                        <motion.div
                                            className="bg-primary h-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* RIGHT PANEL: Results (Flex-1) */}
                    <AnimatePresence>
                        {hasSearched && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex-1 flex flex-col h-full overflow-hidden bg-muted/5 rounded-xl border"
                            >

                                {/* Stats Header (Fixed Top of Right Panel) */}
                                {courseFilter && !loading && courseFilteredResults.length > 0 && stats && (
                                    <div className="p-3 border-b bg-card/50 backdrop-blur-sm z-10">
                                        <div className="grid grid-cols-5 gap-2">
                                            {Object.entries(stats).map(([grade, count]) => (
                                                <div
                                                    key={grade}
                                                    onClick={() => setGradeFilter(gradeFilter === grade ? null : grade)}
                                                    className={cn(
                                                        "rounded-md p-2 cursor-pointer transition-all border text-center",
                                                        grade === 'A' ? "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20" :
                                                            grade === 'B' ? "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20" :
                                                                grade === 'C' ? "bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20" :
                                                                    grade === 'D' ? "bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20" :
                                                                        "bg-red-500/10 border-red-500/20 hover:bg-red-500/20",
                                                        gradeFilter === grade ? "ring-2 ring-primary inset-0" : ""
                                                    )}
                                                >
                                                    <div className="text-lg font-bold leading-none">{grade}</div>
                                                    <div className="text-[10px] text-muted-foreground">{count}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Scrollable Table Area */}
                                <div className="flex-1 min-h-0 relative">
                                    <ScrollArea className="h-full w-full p-2">
                                        <div className="pb-2">
                                            {/* Action Bar */}
                                            <div className="flex items-center justify-between mb-2 px-2">
                                                <div className="text-sm font-medium text-muted-foreground">
                                                    Results: {displayData.length}
                                                </div>
                                                {displayData.length > 0 && (
                                                    <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 text-xs">
                                                        <Download className="h-3 w-3 mr-2" />
                                                        CSV
                                                    </Button>
                                                )}
                                            </div>

                                            <Card className="border-0 shadow-none bg-transparent">
                                                <CardContent className="p-0">
                                                    <Table>
                                                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                                            <TableRow>
                                                                <TableHead className="h-9 w-8 px-1 text-center text-[10px] md:text-xs text-muted-foreground">#</TableHead>
                                                                <TableHead className="h-9 w-24 px-1 text-[10px] md:text-xs">Reg No</TableHead>
                                                                <TableHead className="h-9 px-2 text-[10px] md:text-sm">Name</TableHead>
                                                                {courseFilter ? (
                                                                    <>
                                                                        <TableHead className="h-9 w-12 px-1 text-center text-[10px] md:text-xs">Marks</TableHead>
                                                                        <TableHead className="h-9 w-12 px-1 text-center text-[10px] md:text-xs">Grd</TableHead>
                                                                    </>
                                                                ) : (
                                                                    <TableHead className="h-9 w-16 px-1 text-center text-[10px] md:text-xs">CGPA</TableHead>
                                                                )}
                                                                <TableHead className="h-9 w-10 px-1"></TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {loading ? (
                                                                <TableRow>
                                                                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                                                                        Waiting for data...
                                                                    </TableCell>
                                                                </TableRow>
                                                            ) : displayData.length === 0 ? (
                                                                <TableRow>
                                                                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                                                                        {results.length === 0 ? "Start a search to view results." : "No matches found."}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ) : (
                                                                displayData.map(({ student, match }, index) => (
                                                                    <TableRow key={`row-${student.registrationNo}`} className="hover:bg-muted/50 h-10">
                                                                        <TableCell className="py-2 px-1 text-center text-[10px] md:text-sm text-muted-foreground">{index + 1}</TableCell>
                                                                        <TableCell className="py-2 px-1 font-mono text-[10px] md:text-xs whitespace-nowrap">{student.registrationNo}</TableCell>
                                                                        <TableCell className="py-2 px-2 text-[11px] md:text-sm font-medium max-w-[80px] md:max-w-[200px] overflow-x-auto whitespace-nowrap scrollbar-hide">
                                                                            {student.name}
                                                                        </TableCell>
                                                                        {courseFilter && match ? (
                                                                            <>
                                                                                <TableCell className="py-2 px-1 text-center font-mono text-[11px] md:text-sm">{match.marks}</TableCell>
                                                                                <TableCell className="py-2 px-1 text-center">
                                                                                    <Badge variant={match.grade === 'F' ? 'destructive' : 'secondary'} className="font-bold h-5 px-1.5 text-[10px]">
                                                                                        {match.grade}
                                                                                    </Badge>
                                                                                </TableCell>
                                                                            </>
                                                                        ) : (
                                                                            <TableCell className="text-center font-bold text-primary py-2 px-1 text-xs md:text-sm">
                                                                                {student.cgpa.toFixed(2)}
                                                                            </TableCell>
                                                                        )}
                                                                        <TableCell className="py-2 px-1 text-right">
                                                                            {match && (
                                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setSelectedSubject(match)}>
                                                                                    <Info className="h-4 w-4" />
                                                                                </Button>
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </ScrollArea>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </motion.div>

                {/* Modals */}
                <CourseDetailModal
                    isOpen={!!selectedSubject}
                    onClose={() => setSelectedSubject(null)}
                    course={selectedSubject}
                />

                <AGReviewDialog
                    isOpen={isReviewOpen}
                    initialAGs={pendingAGs}
                    onClose={() => setIsReviewOpen(false)}
                    onConfirm={(ags) => {
                        setIsReviewOpen(false);
                        handleExcelFetch(ags);
                    }}
                />
            </div>
        </Layout>
    );
}
