import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Search, Loader2, Download, ArrowRightLeft, Eye } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { AGNumberInput } from "@/components/ui/AGNumberInput";
import { ExcelUpload } from "@/components/excel/ExcelUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatAGNumber, generateAGRange, calculateGPA, parseAGNumber } from "@/lib/gpaCalculator";
import type { StudentResult, Subject } from "@/types/result";
import { uafScraper } from "@/lib/uaf-scraper";
import { StudentDetailModal } from "@/components/results/StudentDetailModal";



export default function ClassResult() {
  const [tab, setTab] = useState("range");
  const [startAG, setStartAG] = useState({ year: "", number: "" });
  const [endAG, setEndAG] = useState({ year: "", number: "" });
  const [excelAGs, setExcelAGs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);

  const handleRangeFetch = async () => {
    if (!startAG.year || !startAG.number || !endAG.year || !endAG.number) return;

    setLoading(true);
    setProgress(0);
    setResults([]);

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

  const handleExcelFetch = async () => {
    if (excelAGs.length === 0) return;

    setLoading(true);
    setProgress(0);
    setResults([]);

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
  };

  const isRangeValid =
    startAG.year.length === 4 &&
    startAG.number.length >= 1 &&
    endAG.year.length === 4 &&
    endAG.number.length >= 1;

  const exportCSV = () => {
    if (results.length === 0) return;

    const headers = ["Name", "Registration No", "GPA", "CGPA"];
    const rows = results.map((r) => {
      const latestSemester = r.semesters.length > 0 ? r.semesters[0] : null;
      const latestGPA = latestSemester ? latestSemester.gpa.toFixed(2) : "N/A";
      return [r.name, r.registrationNo, latestGPA, r.cgpa.toFixed(2)];
    });

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "class_results.csv";
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
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-success/10 text-success mb-4">
            <Users className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Class Result
          </h1>
          <p className="text-muted-foreground">
            Fetch results for multiple students using AG range or Excel upload
          </p>
        </motion.div>

        {/* Input Methods */}
        <Tabs value={tab} onValueChange={setTab} className="mb-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="range" className="gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              AG Range
            </TabsTrigger>
            <TabsTrigger value="excel" className="gap-2">
              <Download className="h-4 w-4" />
              Excel Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="range" className="mt-6">
            <Card>
              <CardHeader className="text-center">
                <CardTitle>AG Number Range</CardTitle>
                <CardDescription>
                  Enter starting and ending AG numbers to fetch results for all students in between
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center md:items-end justify-center gap-4 mb-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Start AG</span>
                    <AGNumberInput value={startAG} onChange={setStartAG} className="w-[290px] md:w-auto" />
                  </div>
                  <div className="h-11 flex items-center justify-center hidden md:flex">
                    <span className="text-2xl font-bold text-muted-foreground pb-1">→</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-muted-foreground">End AG</span>
                    <AGNumberInput value={endAG} onChange={setEndAG} className="w-[290px] md:w-auto" />
                  </div>
                  <Button
                    size="lg"
                    onClick={handleRangeFetch}
                    disabled={!isRangeValid || loading}
                    className="w-[290px] md:w-auto"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Fetch All
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="excel" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <ExcelUpload onAGNumbersChange={setExcelAGs} />
              <Card>
                <CardHeader>
                  <CardTitle>Ready to Fetch</CardTitle>
                  <CardDescription>
                    {excelAGs.length} AG numbers loaded
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    size="lg"
                    onClick={handleExcelFetch}
                    disabled={excelAGs.length === 0 || loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Fetch All Results
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Progress Bar */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
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
                Processing: {Math.round(progress)}%
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Table */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Class Results</CardTitle>
                      <CardDescription>{results.length} students fetched</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={exportCSV}>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Registration No</TableHead>
                          <TableHead className="text-center">Latest GPA</TableHead>
                          <TableHead className="text-center">CGPA</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((result, index) => {
                          // Find latest semester for GPA display
                          // Semesters are now sorted reverse-chronologically (Latest first)
                          const latestSemester = result.semesters.length > 0 ? result.semesters[0] : null;
                          const latestGPA = latestSemester ? latestSemester.gpa : 0;

                          return (
                            <motion.tr
                              key={result.registrationNo}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className="hover:bg-muted/50"
                            >
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell>{result.name}</TableCell>
                              <TableCell className="font-mono text-sm">
                                {result.registrationNo}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant="secondary"
                                  className="bg-primary/10 text-primary hover:bg-primary/20 font-bold"
                                >
                                  {latestGPA.toFixed(2) || "N/A"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-bold text-primary">
                                  {result.cgpa.toFixed(2)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                                  onClick={() => setSelectedStudent(result)}
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </motion.tr>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {results.map((result, index) => {
                      const latestSemester = result.semesters.length > 0 ? result.semesters[0] : null;
                      const latestGPA = latestSemester ? latestSemester.gpa : 0;

                      return (
                        <motion.div
                          key={result.registrationNo}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex flex-col gap-3"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-lg">{result.name}</h3>
                              <p className="text-sm font-mono text-muted-foreground">{result.registrationNo}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-xs text-muted-foreground uppercase tracking-wider">CGPA</span>
                              <span className="font-bold text-xl text-primary">{result.cgpa.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t mt-1">
                            <span className="text-sm text-muted-foreground">Latest GPA:</span>
                            <Badge
                              variant="secondary"
                              className="bg-primary/10 text-primary hover:bg-primary/20 font-bold"
                            >
                              {latestGPA.toFixed(2) || "N/A"}
                            </Badge>
                          </div>
                          <Button
                            variant="outline"
                            className="w-full mt-2"
                            onClick={() => setSelectedStudent(result)}
                          >
                            View Details <Eye className="ml-2 h-4 w-4" />
                          </Button>
                        </motion.div>
                      )
                    })}
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
    </Layout >
  );
}
