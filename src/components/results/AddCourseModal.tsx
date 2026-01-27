
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Subject } from "@/types/result";

import { calculateCourseGP, calculateGradeLetter } from "@/lib/gpaCalculator";

interface AddCourseModalProps {
    isOpen: boolean;
    onClose: () => void;
    semesterName: string;
    onAddCourse: (course: Subject) => void;
}

export function AddCourseModal({ isOpen, onClose, semesterName, onAddCourse }: AddCourseModalProps) {
    const [courseCode, setCourseCode] = useState("");
    const [courseTitle, setCourseTitle] = useState("");
    const [creditHours, setCreditHours] = useState("");
    const [obtainedMarks, setObtainedMarks] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const credits = parseInt(creditHours);
        const marks = parseFloat(obtainedMarks);
        const totalMarks = credits * 20;

        const gradePoints = calculateCourseGP(marks, credits);
        const grade = calculateGradeLetter(marks, credits);

        const newCourse: Subject = {
            code: courseCode,
            name: courseTitle || courseCode,
            creditHours: credits,
            fullCreditHours: `${credits}(${credits}-0)`, // Defaulting split
            marks: marks,
            mid: 0,
            assignment: 0,
            final: marks, // Assigning all obtained to final for simplicity in this manual mode
            practical: 0,
            grade: grade,
            gradePoints: gradePoints
        };

        onAddCourse(newCourse);
        resetForm();
        onClose();
    };

    const resetForm = () => {
        setCourseCode("");
        setCourseTitle("");
        setCreditHours("");
        setObtainedMarks("");
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const maxMarks = creditHours ? parseInt(creditHours) * 20 : 0;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Course to {semesterName}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">Course Code</Label>
                            <Input
                                id="code"
                                placeholder="e.g., CS-101"
                                required
                                value={courseCode}
                                onChange={(e) => setCourseCode(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="credits">Credit Hours</Label>
                            <Select required value={creditHours} onValueChange={setCreditHours}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5, 6].map((h) => (
                                        <SelectItem key={h} value={h.toString()}>
                                            {h}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Course Title (Optional)</Label>
                        <Input
                            id="title"
                            placeholder="e.g., Intro to Computing"
                            value={courseTitle}
                            onChange={(e) => setCourseTitle(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="marks">
                            Obtained Marks
                            {maxMarks > 0 && <span className="text-muted-foreground ml-1">(Max: {maxMarks})</span>}
                        </Label>
                        <Input
                            id="marks"
                            type="number"
                            step="0.1"
                            min="0"
                            max={maxMarks || undefined}
                            required
                            placeholder="e.g., 45"
                            value={obtainedMarks}
                            onChange={(e) => setObtainedMarks(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button type="submit">Add Course</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
