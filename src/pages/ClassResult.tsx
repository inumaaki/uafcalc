import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Download, Upload, Users, XCircle } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { AGNumberInput } from "@/components/ui/AGNumberInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { generateAGRange, parseAGNumber } from "@/lib/gpaCalculator";
import { uafScraper } from "@/lib/uaf-scraper";
import type { StudentResult } from "@/types/result";
import { StudentDetailModal } from "@/components/results/StudentDetailModal";
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
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<{ AG: string }>(worksheet);

        const excelAGs = jsonData.map(row => row.AG).filter(ag => ag && typeof ag === 'string');

        if (excelAGs.length > 0) {
          await handleExcelFetch(excelAGs);
        }
      } catch (error) {
        console.error("Error parsing Excel:", error);
      }
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

        {/* Controls */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Range Fetch */}
          <Card className="border-primary/20 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Search className="w-24 h-24 text-primary" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Users className="h-5 w-5" />
                By AG Range
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                {/* RESPONSIVE INPUT LAYOUT: Stack on Mobile, Row on Desktop */}
                <div className="flex flex-col md:flex-row items-center gap-4 w-full justify-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="md:hidden text-xs font-medium text-muted-foreground">Start</span>
                    <AGNumberInput value={startAG} onChange={setStartAG} onEnter={handleRangeFetch} className="w-full max-w-[280px] md:w-auto" />
                  </div>

                  <span className="text-muted-foreground font-bold hidden md:block">to</span>

                  <div className="flex flex-col items-center gap-1">
                    <span className="md:hidden text-xs font-medium text-muted-foreground">End</span>
                    <AGNumberInput value={endAG} onChange={setEndAG} onEnter={handleRangeFetch} className="w-full max-w-[280px] md:w-auto" />
                  </div>
                </div>

                <Button
                  className="w-full md:w-[280px] font-bold"
                  onClick={handleRangeFetch}
                  disabled={!isRangeValid || loading}
                >
                  {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Search className="mr-2 h-4 w-4" />}
                  Fetch Class
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Excel Upload */}
          <Card className="border-primary/20 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Upload className="w-24 h-24 text-primary" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Upload className="h-5 w-5" />
                From Excel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="excel-upload">Upload .xlsx / .csv</Label>
                  <Input id="excel-upload" type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} disabled={loading} />
                </div>
                <p className="text-xs text-muted-foreground">
                  File must contain an "AG" column (e.g., "2022-ag-8000").
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

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

        {/* Stats Bar */}
        <AnimatePresence>
          {!loading && results.length > 0 && stats && (
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
                  <p className="text-xs text-muted-foreground mt-1">Est. {grade} Grade</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

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
                          <TableHead className="text-center">CGPA</TableHead>
                          <TableHead className="text-center">Creds</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayData.map((student, index) => (
                          <TableRow key={student.registrationNo} className="hover:bg-muted/50">
                            <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="font-mono whitespace-nowrap">{student.registrationNo}</TableCell>
                            <TableCell className="min-w-[140px]">{student.name}</TableCell>
                            <TableCell className={cn(
                              "text-center font-bold",
                              student.cgpa >= 3 ? "text-emerald-600" :
                                student.cgpa >= 2 ? "text-yellow-600" : "text-red-500"
                            )}>
                              {student.cgpa.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">{student.totalCreditHours}</TableCell>
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
      </div>
    </Layout>
  );
}
