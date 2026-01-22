import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Download, Upload, Users, XCircle, ArrowRightLeft } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { AGNumberInput } from "@/components/ui/AGNumberInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { generateAGRange, parseAGNumber } from "@/lib/gpaCalculator";
import { uafScraper } from "@/lib/uaf-scraper";
import type { StudentResult } from "@/types/result";
import { StudentDetailModal } from "@/components/results/StudentDetailModal";
import { AGReviewDialog } from "@/components/results/AGReviewDialog";
import * as XLSX from 'xlsx';
import { cn } from "@/lib/utils";

export default function ClassResult() {
  const [startAG, setStartAG] = useState({ year: "", number: "" });
  const [endAG, setEndAG] = useState({ year: "", number: "" });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [pendingAGs, setPendingAGs] = useState<string[]>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const handleRangeFetch = async () => {
    if (!startAG.year || !startAG.number || !endAG.year || !endAG.number) return;

    setLoading(true);
    setProgress(0);
    setResults([]);
    setGradeFilter(null);

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

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Read as array of arrays to scan all cells
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

        // Deduplicate
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
      // Reset input
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExcelFetch = async (excelAGs: string[]) => {
    setLoading(true);
    setProgress(0);
    setResults([]);
    setGradeFilter(null);

    await uafScraper.getBatchResults(excelAGs, (prog, result) => {
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
  }

  // Stats Logic: Group by simplified CGPA Buckets -> "Grades"
  const getCGPAPgrade = (cgpa: number) => {
    if (cgpa >= 3.7) return 'A';
    if (cgpa >= 3.0) return 'B';
    if (cgpa >= 2.5) return 'C';
    if (cgpa >= 2.0) return 'D';
    return 'F';
  };

  const stats = useMemo(() => {
    if (results.length === 0) return null;
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    results.forEach(r => {
      const grade = getCGPAPgrade(r.cgpa);
      if (counts[grade] !== undefined) counts[grade]++;
    });
    return counts;
  }, [results]);

  const displayData = useMemo(() => {
    if (!gradeFilter) return results;
    return results.filter(r => getCGPAPgrade(r.cgpa) === gradeFilter);
  }, [results, gradeFilter]);

  const exportCSV = () => {
    if (displayData.length === 0) return;

    const headers = ["Name", "Registration No", "CGPA", "Credit Hours"];
    const rows = displayData.map(r => [
      r.name,
      r.registrationNo,
      r.cgpa.toFixed(2),
      r.totalCreditHours.toString()
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "class_result.csv";
    a.click();
  };

  const isRangeValid =
    startAG.year.length === 4 &&
    startAG.number.length >= 1 &&
    endAG.year.length === 4 &&
    endAG.number.length >= 1;

  return (
    <Layout
      fullWidth={results.length > 0}
      className={results.length > 0 ? "px-2 md:px-4" : ""}
    >
      <div className={cn(
        "flex flex-col items-center justify-center gap-6 transition-all duration-500",
        results.length > 0 ? "min-h-0 py-8 p-0" : "min-h-[85vh] p-4 md:p-8"
      )}>
        <div className={cn(
          "w-full mx-auto transition-all duration-500",
          results.length > 0 ? "w-full" : "max-w-lg"
        )}>
          {/* Header & Controls - Always Compact */}
          <div className="max-w-lg mx-auto w-full">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("text-center", results.length > 0 ? "mb-4" : "mb-6")}
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                <Users className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-1">
                Class Result
              </h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Fetch and analyze results for an entire class sequence or upload a list.
              </p>
            </motion.div>

            {/* Controls */}
            <motion.div
              layout
              className="w-full"
            >
              <Tabs defaultValue="range" className="w-full">
                <TabsList className="grid w-full h-12 grid-cols-2 mb-6 bg-muted/40 p-1.5 rounded-xl border border-border/50">
                  <TabsTrigger value="range" className="gap-2 text-sm">
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    AG Range
                  </TabsTrigger>
                  <TabsTrigger value="excel" className="gap-2 text-sm">
                    <Download className="h-3.5 w-3.5" />
                    Excel Upload
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="range" className="mt-0">
                  <Card className="border-primary/20 shadow-xl">
                    <CardHeader className="text-center pb-2 pt-4">
                      <CardTitle className="text-xl">AG Number Range</CardTitle>
                      <CardDescription className="text-xs">Enter start and end AG numbers to fetch batch.</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Start</span>
                            <AGNumberInput value={startAG} onChange={setStartAG} onEnter={handleRangeFetch} className="w-full h-9 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">End</span>
                            <AGNumberInput value={endAG} onChange={setEndAG} onEnter={handleRangeFetch} className="w-full h-9 text-sm" />
                          </div>
                        </div>

                        <Button
                          className="w-full h-9 font-bold mt-1"
                          onClick={handleRangeFetch}
                          disabled={!isRangeValid || loading}
                        >
                          {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Search className="mr-2 h-4 w-4" />}
                          Fetch All
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="excel" className="mt-0">
                  <Card className="border-primary/20 shadow-xl">
                    <CardHeader className="text-center pb-2 pt-4">
                      <CardTitle className="text-xl">Upload Student List</CardTitle>
                      <CardDescription className="text-xs">Upload Excel/CSV with 'AG' column.</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <Label
                        htmlFor="excel-upload"
                        className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors border-primary/20"
                      >
                        <Upload className="w-6 h-6 mb-2 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-semibold">Click to upload .xlsx/.csv</span>
                        <Input id="excel-upload" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} disabled={loading} />
                      </Label>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>

          {/* Progress */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full max-w-lg mt-4 px-1 mx-auto"
              >
                <div className="bg-muted rounded-full h-2.5 overflow-hidden">
                  <motion.div
                    className="bg-primary h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-sm font-medium text-muted-foreground text-center mt-2">
                  Fetching Results... {Math.round(progress)}%
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Result Display - Full Width */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              // CONTAINER SPACING: Adjust 'mb-8' (bottom space) and 'max-w-4xl' (width)
              className="w-full max-w-5xl mx-auto px-4 md:px-8 mb-8"
            >
              <Card className="w-full border shadow-sm rounded-xl">
                <CardHeader className="px-4 py-4 md:px-8">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <CardTitle>
                        Class Results
                        {gradeFilter && (
                          <Badge className="ml-2 bg-primary text-primary-foreground">
                            Filter: {gradeFilter}
                            <XCircle
                              className="ml-1 h-3 w-3 cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); setGradeFilter(null); }}
                            />
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Found {results.length} students {gradeFilter && `(${displayData.length} shown)`}
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={exportCSV}>
                      <Download className="h-4 w-4 mr-2" />
                      Export List
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                        <TableRow>
                          <TableHead className="h-9 w-8 px-1 md:px-4 text-center text-[10px] md:text-xs text-muted-foreground">#</TableHead>
                          {/* GAP REDUCTION: Removed right padding (pr-0) and used w-[1%] to shrink col to content */}
                          <TableHead className="h-9 w-24 md:w-[13%] pl-1 md:pl-2 pr-0 text-[10px] md:text-xs">Registration</TableHead>
                          {/* GAP REDUCTION: Removed left padding (pl-0) from Name */}
                          <TableHead className="h-9 pl-0 pr-2 md:pr-2 text-[10px] md:text-sm">Name</TableHead>
                          <TableHead className="h-9 w-12 md:w-20 px-1 md:px-4 text-center text-[10px] md:text-xs">GPA</TableHead>
                          <TableHead className="h-9 w-12 md:w-20 px-1 md:px-4 text-center text-[10px] md:text-xs">CGPA</TableHead>
                          <TableHead className="h-9 w-10 md:w-16 px-1"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayData.map((student, index) => (
                          // ROW SPACING: Adjust 'h-8' (height) and 'py-1' (padding) to bring elements closer
                          <TableRow key={student.registrationNo} className="hover:bg-muted/50 h-8">
                            <TableCell className="py-1 px-1 md:px-4 text-center text-[10px] md:text-sm text-muted-foreground">{index + 1}</TableCell>
                            {/* GAP REDUCTION: padding-right 0 */}
                            <TableCell className="py-1 pl-1 md:pl-2 pr-0 font-mono text-[10px] md:text-xs whitespace-nowrap">{student.registrationNo}</TableCell>
                            {/* GAP REDUCTION: padding-left 0 */}
                            <TableCell className="py-1 pl-0 pr-2 md:pr-2 text-[11px] md:text-sm font-medium max-w-[80px] md:max-w-[200px] overflow-x-auto whitespace-nowrap scrollbar-hide">
                              {student.name}
                            </TableCell>
                            <TableCell className="py-1 px-1 md:px-4 text-center font-bold text-blue-600 text-[11px] md:text-sm">
                              {student.semesters.length > 0 ? student.semesters[0].gpa.toFixed(2) : "-"}
                            </TableCell>
                            <TableCell className={cn(
                              "py-1 px-1 md:px-4 text-center font-bold text-[11px] md:text-sm",
                              student.cgpa >= 3 ? "text-emerald-600" :
                                student.cgpa >= 2 ? "text-yellow-600" : "text-red-500"
                            )}>
                              {student.cgpa.toFixed(2)}
                            </TableCell>
                            <TableCell className="py-1 px-1 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={() => setSelectedStudent(student)}
                              >
                                <Search className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
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
