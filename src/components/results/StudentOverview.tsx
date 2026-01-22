import { motion } from "framer-motion";
import { User, BookOpen, Award, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { GPADisplay } from "@/components/ui/GPADisplay";
import type { StudentResult } from "@/types/result";

interface StudentOverviewProps {
  student: StudentResult;
}

export function StudentOverview({ student }: StudentOverviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden mx-4 md:mx-6">
        <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-foreground/20 backdrop-blur">
              <User className="h-10 w-10 text-primary-foreground" />
            </div>

            {/* Student Info */}
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl font-bold">{student.name}</h2>
              <p className="text-primary-foreground/80">{student.registrationNo}</p>
              {student.program && (
                <p className="text-sm text-primary-foreground/60 mt-1">
                  {student.program}
                </p>
              )}
            </div>

            {/* CGPA Display */}
            <div className="bg-primary-foreground/10 backdrop-blur rounded-xl p-4">
              <GPADisplay gpa={student.cgpa} label="CGPA" size="lg" />
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
            <StatItem
              icon={BookOpen}
              label="Total Semesters"
              value={student.semesters.length.toString()}
            />
            <StatItem
              icon={BookOpen}
              label="Total Courses"
              value={student.semesters.reduce((acc, sem) => acc + sem.subjects.length, 0).toString()}
            />
            <StatItem
              icon={Award}
              label="Total Credits"
              value={student.totalCreditHours.toString()}
            />
            <StatItem
              icon={TrendingUp}
              label="CGPA"
              value={student.cgpa.toFixed(2)}
              highlight
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: typeof User;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${highlight ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-bold ${highlight ? "text-primary" : "text-foreground"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
