import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, AlertCircle, UserCheck, Download } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { AGNumberInput } from "@/components/ui/AGNumberInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ResultCard } from "@/components/results/ResultCard";
import { StudentOverview } from "@/components/results/StudentOverview";
import { formatAGNumber, calculateGPA, calculateCGPA } from "@/lib/gpaCalculator";
import { gradingScale } from "@/config/semesterMap";
import type { StudentResult, SemesterResult, Subject } from "@/types/result";
import { cn } from "@/lib/utils";
import { generatePDFReport } from "@/lib/pdfGenerator";



import { uafScraper } from "@/lib/uaf-scraper";

export default function IndividualResult() {
  const [agNumber, setAgNumber] = useState({ year: "", number: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StudentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    if (!agNumber.year || !agNumber.number) {
      setError("Please enter a complete AG number");
      return;
    }

    if (agNumber.year.length !== 4) {
      setError("Year must be 4 digits");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formattedAG = formatAGNumber(agNumber.year, agNumber.number);
      const fetchedResult = await uafScraper.getResult(formattedAG);
      setResult(fetchedResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch result");
    } finally {
      setLoading(false);
    }
  };

  const isValid = agNumber.year.length === 4 && agNumber.number.length >= 1;


  const handleAddCourse = (semesterName: string, newSubject: Subject) => {
    if (!result) return;

    // Create a deep copy of the semester to modify
    const updatedSemesters = [...result.semesters];
    const semesterIndex = updatedSemesters.findIndex((s) => s.semester === semesterName);

    if (semesterIndex === -1) return;

    // Clone the specific semester and its subjects
    const updatedSemester = {
      ...updatedSemesters[semesterIndex],
      subjects: [...updatedSemesters[semesterIndex].subjects, newSubject],
    };
    updatedSemesters[semesterIndex] = updatedSemester;

    // Recalculate Semester GPA & Totals
    updatedSemester.gpa = calculateGPA(updatedSemester.subjects);

    // Update semester totals for display
    let totalPoints = 0;
    let totalCredits = 0;
    updatedSemester.subjects.forEach((sub) => {
      totalPoints += sub.gradePoints;
      totalCredits += sub.creditHours;
    });
    updatedSemester.totalCreditHours = totalCredits;
    updatedSemester.totalGradePoints = totalPoints;

    // Recalculate Overall CGPA
    const newCGPA = calculateCGPA(updatedSemesters);

    // Update overall totals
    let grandTotalPoints = 0;
    let grandTotalCredits = 0;
    updatedSemesters.forEach((sem) => {
      grandTotalPoints += sem.totalGradePoints;
      grandTotalCredits += sem.totalCreditHours;
    });

    const finalResult = {
      ...result,
      semesters: updatedSemesters,
      cgpa: newCGPA,
      totalCreditHours: grandTotalCredits,
    };

    setResult(finalResult);
  };

  const handleDeleteCourse = (semesterName: string, courseCode: string) => {
    if (!result) return;

    const updatedSemesters = [...result.semesters];
    const semesterIndex = updatedSemesters.findIndex((s) => s.semester === semesterName);

    if (semesterIndex === -1) return;

    // Clone the semester and filter subjects
    const updatedSemester = {
      ...updatedSemesters[semesterIndex],
      subjects: updatedSemesters[semesterIndex].subjects.filter((s) => s.code !== courseCode),
    };
    updatedSemesters[semesterIndex] = updatedSemester;

    // Recalculate Semester GPA & Totals
    updatedSemester.gpa = calculateGPA(updatedSemester.subjects);

    let totalPoints = 0;
    let totalCredits = 0;
    updatedSemester.subjects.forEach((sub) => {
      totalPoints += sub.gradePoints;
      totalCredits += sub.creditHours;
    });
    updatedSemester.totalCreditHours = totalCredits;
    updatedSemester.totalGradePoints = totalPoints;

    // Recalculate Overall CGPA
    const newCGPA = calculateCGPA(updatedSemesters);

    // Update overall totals
    let grandTotalPoints = 0;
    let grandTotalCredits = 0;
    updatedSemesters.forEach((sem) => {
      grandTotalPoints += sem.totalGradePoints;
      grandTotalCredits += sem.totalCreditHours;
    });

    const finalResult = {
      ...result,
      semesters: updatedSemesters,
      cgpa: newCGPA,
      totalCreditHours: grandTotalCredits,
    };

    setResult(finalResult);
  };

  return (
    <Layout>
      <div className={cn(
        "flex flex-col items-center justify-center transition-all duration-500",
        result ? "min-h-0 px-2 md:px-8 pb-8 pt-0" : "min-h-[85vh] p-2 md:p-8"
      )}>
        <div className={cn(
          "w-full mx-auto transition-all duration-500",
          result ? "max-w-7xl" : "max-w-lg"
        )}>
          {/* Top Actions Bar - Visible only when result is present */}
          {result && !loading && (
            <>
              {/* Desktop Button - Hidden on mobile */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="hidden md:flex justify-start mb-4"
              >
                <Button
                  onClick={() => generatePDFReport(result)}
                  className="gap-2 shadow-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Download className="h-4 w-4" />
                  Download Report
                </Button>
              </motion.div>

              {/* Mobile FAB - Fixed at bottom left */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="fixed bottom-6 left-6 z-50 md:hidden"
              >
                <Button
                  onClick={() => generatePDFReport(result)}
                  size="lg"
                  className="h-14 w-14 rounded-full shadow-2xl bg-primary/40 backdrop-blur-md border border-white/20 hover:bg-primary/60 transition-all duration-300 p-0 flex items-center justify-center text-primary-foreground"
                >
                  <Download className="h-6 w-6" />
                  <span className="sr-only">Download Report</span>
                </Button>
              </motion.div>
            </>
          )}

          {/* Header & Search - Always Compact */}
          <div className="max-w-lg mx-auto w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-6"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                <UserCheck className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-1">
                Individual Result
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your complete AG number to fetch result.
              </p>
            </motion.div>

            {/* Search Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="mb-8 border-primary/20 shadow-xl">
                <CardHeader className="text-center pb-2 pt-4">
                  <CardTitle className="text-xl flex items-center justify-center gap-2">
                    <Search className="h-4 w-4 text-primary" />
                    Enter parameters
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Format: YYYY-AG-XXXX
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <AGNumberInput
                        value={agNumber}
                        onChange={setAgNumber}
                        onEnter={handleFetch}
                        className="w-full"
                      />
                    </div>

                    <Button
                      size="default"
                      onClick={handleFetch}
                      disabled={!isValid || loading}
                      className="w-full h-11 font-bold rounded-lg shadow-md hover:translate-y-[-1px] transition-all"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Fetch Result
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Error Alert */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading State */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16"
                >
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-muted"></div>
                    <div className="absolute top-0 h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  </div>
                  <p className="mt-4 text-muted-foreground">
                    Fetching result from LMS...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Result Display - Full Width */}
          <AnimatePresence>
            {result && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Student Overview */}
                <StudentOverview student={result} />

                {/* Semester Results */}
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">
                    Semester Results
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {result.semesters.map((semester, index) => (
                      <ResultCard
                        key={index}
                        semester={semester}
                        index={index}
                        onAddCourse={handleAddCourse}
                        onDeleteCourse={handleDeleteCourse}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
