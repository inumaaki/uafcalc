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
      <div className="max-w-7xl mx-auto min-h-[82vh] flex flex-col justify-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
            <UserCheck className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Individual Result
          </h1>
          <p className="text-muted-foreground">
            Enter your AG number to fetch your complete result and GPA
          </p>
        </motion.div>

        {/* Search Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-8 max-w-5xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Enter AG Number
              </CardTitle>
              <CardDescription>
                Format: YYYY-AG-XXXX (e.g., 2022-ag-7745)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <AGNumberInput
                  value={agNumber}
                  onChange={setAgNumber}
                  onEnter={handleFetch}
                  className="flex-1 w-full"
                />
                <Button
                  size="lg"
                  onClick={handleFetch}
                  disabled={!isValid || loading}
                  className="w-full sm:w-auto min-w-[140px]"
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

              {/* Quick Example */}
              <p className="text-xs text-muted-foreground mt-3 text-left">
                Example: Enter <span className="font-mono">2022</span> in year and{" "}
                <span className="font-mono">7745</span> in number field
              </p>
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

        {/* Result Display */}
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
    </Layout>
  );
}
