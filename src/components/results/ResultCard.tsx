import { useState } from "react";
import { motion } from "framer-motion";
import { Info, Award, TrendingUp, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GPADisplay } from "@/components/ui/GPADisplay";
import { gradeColors, semesterMap } from "@/config/semesterMap";
import { CourseDetailModal } from "./CourseDetailModal";
import { AddCourseModal } from "./AddCourseModal";
import type { SemesterResult, Subject } from "@/types/result";
import { cn } from "@/lib/utils";

interface ResultCardProps {
  semester: SemesterResult;
  index: number;
  onAddCourse?: (semesterNumber: number, course: Subject) => void;
  onDeleteCourse?: (semesterNumber: number, courseCode: string) => void;
}

export function ResultCard({ semester, index, onAddCourse, onDeleteCourse }: ResultCardProps) {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardHeader className="bg-primary/5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                {semester.semesterNumber}
              </div>
              <div>
                <CardTitle className="text-lg">
                  Semester {semester.semesterNumber}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {semester.semester}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GPADisplay gpa={semester.gpa} label="GPA" size="sm" showStatus={false} />
              {onAddCourse && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full hover:bg-primary/10 ml-2"
                  onClick={() => setIsAddCourseOpen(true)}
                  title="Add Course"
                >
                  <Plus className="h-4 w-4 text-primary" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 md:p-3 text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Course
                  </th>
                  <th className="text-center p-2 md:p-3 text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Hrs
                  </th>
                  <th className="text-center p-2 md:p-3 text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Marks
                  </th>
                  <th className="text-center p-2 md:p-3 text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="text-center p-2 md:p-3 text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    GP
                  </th>
                  {onDeleteCourse && (
                    <th className="text-center p-2 md:p-3 text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider w-10">
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {semester.subjects.map((subject, idx) => (
                  <motion.tr
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + idx * 0.05 }}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-2 md:p-3">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <span className="text-foreground font-medium text-xs md:text-sm">
                          {subject.code || "N/A"}
                        </span>
                        <div className="relative flex items-center gap-1">
                          <button
                            onClick={() => setSelectedSubject(subject)}
                            className="p-1 hover:bg-muted rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                            title="View Details"
                          >
                            <Info className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground/70 cursor-pointer hover:text-primary transition-colors" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="p-2 md:p-3 text-center text-xs md:text-sm">
                      {subject.fullCreditHours || subject.creditHours}
                    </td>
                    <td className="p-2 md:p-3 text-center text-xs md:text-sm font-medium">
                      {subject.marks || "-"}
                    </td>
                    <td className="p-2 md:p-3 text-center">
                      <Badge
                        className={cn(
                          "font-bold text-[10px] md:text-xs px-1.5 py-0.5 md:px-2.5 md:py-0.5",
                          gradeColors[subject.grade] || "text-foreground"
                        )}
                        variant="outline"
                      >
                        {subject.grade}
                      </Badge>
                    </td>
                    <td className="p-2 md:p-3 text-center">
                      <span className="font-bold text-orange-600 text-xs md:text-sm">
                        {subject.gradePoints.toFixed(2)}
                      </span>
                    </td>
                    {onDeleteCourse && (
                      <td className="p-2 md:p-3 text-center">
                        <button
                          onClick={() => onDeleteCourse(semester.semesterNumber, subject.code || "")}
                          className="p-1 hover:bg-destructive/10 rounded-full text-muted-foreground/70 hover:text-destructive transition-colors focus:outline-none focus:ring-2 focus:ring-destructive/50"
                          title="Delete Course"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Stats */}
          <div className="flex items-center justify-between p-4 bg-muted/30 border-t border-border">
            <div className="flex items-center gap-2 text-sm">
              <Award className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Total Credits:</span>
              <span className="font-bold text-foreground">{semester.totalCreditHours}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-muted-foreground">Grade Points:</span>
              <span className="font-bold text-foreground">
                {semester.totalGradePoints.toFixed(1)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <CourseDetailModal
        isOpen={!!selectedSubject}
        onClose={() => setSelectedSubject(null)}
        course={selectedSubject}
      />

      {onAddCourse && (
        <AddCourseModal
          isOpen={isAddCourseOpen}
          onClose={() => setIsAddCourseOpen(false)}
          semesterName={`Semester ${semester.semesterNumber}`}
          onAddCourse={(course) => onAddCourse(semester.semesterNumber, course)}
        />
      )}
    </motion.div>
  );
}
