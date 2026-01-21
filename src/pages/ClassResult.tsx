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
    <Layout>
      <div className="max-w-6xl mx-auto min-h-[81vh] flex flex-col justify-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
            <Users className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Class Result
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Fetch and analyze results for an entire class sequence or upload a list.
          </p>
        </motion.div>

        {/* Tabs Controls */}
        <Tabs defaultValue="range" className="mb-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-10 mb-6">
            <TabsTrigger value="range" className="gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              AG Range
            </TabsTrigger>
            <TabsTrigger value="excel" className="gap-2">
              <Download className="h-4 w-4" />
              Excel Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="range" className="mt-0">
            <Card className="border-primary/20 shadow-lg">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">AG Number Range</CardTitle>
                <CardDescription>Enter starting and ending AG numbers to fetch results for all students in between</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center md:items-end justify-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Start AG</span>
                    <AGNumberInput value={startAG} onChange={setStartAG} onEnter={handleRangeFetch} className="w-full max-w-[290px] md:w-auto" />
                  </div>

                  <div className="h-11 flex items-center justify-center hidden md:flex">
                    <span className="text-2xl font-bold text-muted-foreground pb-1">→</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-muted-foreground">End AG</span>
                    <AGNumberInput value={endAG} onChange={setEndAG} onEnter={handleRangeFetch} className="w-full max-w-[290px] md:w-auto" />
                  </div>

                  <Button
                    className="w-full max-w-[290px] md:w-auto h-11 font-bold px-8 mt-2 md:mt-0"
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
            <Card className="border-primary/20 shadow-lg">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">Upload Student List</CardTitle>
                <CardDescription>Upload an Excel or CSV file containing a list of Registration numbers (column "AG")</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="max-w-md mx-auto flex flex-col gap-4">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="excel-upload" className="sr-only">Upload .xlsx / .csv</Label>
                    <div className="flex items-center justify-center w-full">
                      <Label
                        htmlFor="excel-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors border-primary/20"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                          <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                          <p className="text-xs text-muted-foreground">.xlsx or .csv files</p>
                        </div>
                        <Input id="excel-upload" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} disabled={loading} />
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Progress */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 px-4"
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
                Fetching Results... {Math.round(progress)}%
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Bar - Removed as per request */}

        {/* Results Table */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
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
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Registration</TableHead>
                          <TableHead className="min-w-[140px]">Name</TableHead>
                          <TableHead className="text-center">GPA</TableHead>
                          <TableHead className="text-center">CGPA</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayData.map((student, index) => (
                          <TableRow key={student.registrationNo} className="hover:bg-muted/50">
                            <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="font-mono whitespace-nowrap">{student.registrationNo}</TableCell>
                            <TableCell className="min-w-[140px]">{student.name}</TableCell>
                            <TableCell className="text-center font-bold text-blue-600">
                              {student.semesters.length > 0 ? student.semesters[0].gpa.toFixed(2) : "-"}
                            </TableCell>
                            <TableCell className={cn(
                              "text-center font-bold",
                              student.cgpa >= 3 ? "text-emerald-600" :
                                student.cgpa >= 2 ? "text-yellow-600" : "text-red-500"
                            )}>
                              {student.cgpa.toFixed(2)}
                            </TableCell>
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
