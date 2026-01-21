import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StudentOverview } from "./StudentOverview";
import { ResultCard } from "./ResultCard";
import type { StudentResult } from "@/types/result";

interface StudentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: StudentResult | null;
}

export function StudentDetailModal({ isOpen, onClose, student }: StudentDetailModalProps) {
    if (!student) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-7xl h-[90vh] p-0 flex flex-col gap-0 bg-background/95 backdrop-blur-sm">
                <DialogHeader className="p-6 pb-2 border-b shrink-0">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <span className="text-primary">Student Details</span>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Detailed academic record including GPA and course marks for {student.name}.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-8 pb-10">
                        {/* Reusing the Overview Component */}
                        <StudentOverview student={student} />

                        {/* Semester Results Grid */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                <span className="h-6 w-1 bg-primary rounded-full"></span>
                                Semester Breakdown
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {student.semesters.map((semester, index) => (
                                    <ResultCard
                                        key={index}
                                        semester={semester}
                                        index={index}
                                    // No add/delete handlers needed for read-only view
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
