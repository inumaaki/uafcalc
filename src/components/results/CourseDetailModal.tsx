import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { gradeColors } from "@/config/semesterMap";
import { cn } from "@/lib/utils";
import type { Subject } from "@/types/result";

interface CourseDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    course: Subject | null;
}

export function CourseDetailModal({ isOpen, onClose, course }: CourseDetailModalProps) {
    if (!course) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md overflow-hidden rounded-2xl p-6">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl font-bold">Course Details</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Course Code */}
                    <div>
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Course Code
                        </h3>
                        <p className="mt-1 text-lg font-bold text-foreground">
                            {course.code || "N/A"} - {course.name}
                        </p>
                    </div>

                    {/* Grade & Credit Hours Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Grade
                            </h3>
                            <div className="mt-1">
                                <Badge
                                    className={cn(
                                        "font-bold px-3 py-1",
                                        gradeColors[course.grade] || "text-foreground"
                                    )}
                                    variant="outline"
                                >
                                    {course.grade}
                                </Badge>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Credit Hours
                            </h3>
                            <p className="mt-1 text-base font-semibold text-foreground">
                                {course.fullCreditHours || course.creditHours}
                            </p>
                        </div>
                    </div>

                    {/* Marks Breakdown */}
                    <div className="bg-muted/40 rounded-xl p-5 border border-border/50">
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                            Marks Breakdown
                        </h3>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                            <div>
                                <p className="text-xs text-muted-foreground">Mid Term</p>
                                <p className="text-sm font-bold text-foreground">
                                    {course.mid !== undefined ? course.mid : "-"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Assignment</p>
                                <p className="text-sm font-bold text-foreground">
                                    {course.assignment !== undefined ? course.assignment : "-"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Final</p>
                                <p className="text-sm font-bold text-foreground">
                                    {course.final !== undefined ? course.final : "-"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Practical</p>
                                <p className="text-sm font-bold text-foreground">
                                    {course.practical !== undefined ? course.practical : "-"}
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-border/50">
                            <div className="flex justify-between items-center">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Total Marks
                                </p>
                                <p className="text-2xl font-bold text-orange-600">
                                    {course.marks !== undefined ? course.marks : "-"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
