import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, AlertCircle, UserCheck } from "lucide-react";
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

    // Create a new copy of result to modify
    const updatedResult = { ...result };
    const semesterIndex = updatedResult.semesters.findIndex(s => s.semester === semesterName);

    if (semesterIndex === -1) return;

    // Add the new course
    updatedResult.semesters[semesterIndex].subjects.push(newSubject);

    // Recalculate Semester GPA & Totals
    const semester = updatedResult.semesters[semesterIndex];
    semester.gpa = calculateGPA(semester.subjects);

    // Update semester totals for display
    let totalPoints = 0;
    let totalCredits = 0;
    semester.subjects.forEach(sub => {
      totalPoints += sub.gradePoints;
      totalCredits += sub.creditHours;
    });
    semester.totalCreditHours = totalCredits;
    semester.totalGradePoints = totalPoints;

    // Recalculate Overall CGPA
    updatedResult.cgpa = calculateCGPA(updatedResult.semesters);

    // Update overall totals (Simple sum for display, though CGPA uses best attempts)
    let grandTotalPoints = 0;
    let grandTotalCredits = 0;
    updatedResult.semesters.forEach(sem => {
      grandTotalPoints += sem.totalGradePoints;
      grandTotalCredits += sem.totalCreditHours;
    });
    updatedResult.totalCreditHours = grandTotalCredits;

    setResult(updatedResult);
  };

  const handleDeleteCourse = (semesterName: string, courseCode: string) => {
    if (!result) return;

    const updatedResult = { ...result };
    const semesterIndex = updatedResult.semesters.findIndex(s => s.semester === semesterName);

    if (semesterIndex === -1) return;

    const semester = updatedResult.semesters[semesterIndex];
    // Filter out the course
    semester.subjects = semester.subjects.filter(s => s.code !== courseCode);

    // Recalculate Semester GPA & Totals
    semester.gpa = calculateGPA(semester.subjects);

    let totalPoints = 0;
    let totalCredits = 0;
    semester.subjects.forEach(sub => {
      totalPoints += sub.gradePoints;
      totalCredits += sub.creditHours;
    });
    semester.totalCreditHours = totalCredits;
    semester.totalGradePoints = totalPoints;

    // Recalculate Overall CGPA
    updatedResult.cgpa = calculateCGPA(updatedResult.semesters);

    // Update overall totals
    let grandTotalPoints = 0;
    let grandTotalCredits = 0;
    updatedResult.semesters.forEach(sem => {
      grandTotalPoints += sem.totalGradePoints;
      grandTotalCredits += sem.totalCreditHours;
    });
    updatedResult.totalCreditHours = grandTotalCredits;

    setResult(updatedResult);
  };

  return (
    <Layout>
      <div className={cn(
        "flex flex-col items-center justify-center p-2 md:p-8 transition-all duration-500",
        result ? "min-h-0 py-8" : "min-h-[85vh]"
      )}>
        <div className={cn(
          "w-full mx-auto transition-all duration-500",
          result ? "max-w-7xl" : "max-w-lg"
        )}>
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
