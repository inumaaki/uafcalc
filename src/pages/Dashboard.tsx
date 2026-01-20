import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  User,
  Users,
  Calculator,
  ArrowRight,
  Zap,
  Shield,
  Clock,
  Search,
  ChartColumn,
  Settings,
  FileSpreadsheet,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/StatCard";
import { gradingScale, gradeColors } from "@/config/semesterMap";

const features = [
  {
    icon: User,
    title: "Individual Result",
    description: "Fetch results for a single student using their AG number",
    path: "/individual",
    color: "primary",
  },
  {
    icon: Users,
    title: "Class Result",
    description: "Fetch results for an entire class using AG range or Excel upload",
    path: "/class",
    color: "success",
  },
  {
    icon: Search,
    title: "Smart Search",
    description: "Search and filter results by course, grade, and CGPA",
    path: "/smart-search",
    color: "warning",
  },
];

const highlights = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Get results in seconds with our optimized fetching system",
  },
  {
    icon: Shield,
    title: "Accurate Calculation",
    description: "Precise GPA and CGPA calculations following UAF grading scale",
  },
  {
    icon: Clock,
    title: "Real-time Updates",
    description: "Always get the latest results from the official LMS portal",
  },
];

export default function Dashboard() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary mb-6"
          >
            <GraduationCap className="h-10 w-10 text-primary-foreground" />
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            UAF Result & GPA <br /> <span className="text-gradient">Management System</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            A fast, reliable, and professional platform to fetch official student results
            from UAF LMS and automatically calculate GPA & CGPA.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/individual">
              <Button size="lg" className="gap-2 shadow-lg">
                Get Individual Result
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/class">
              <Button size="lg" variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                Class Results
              </Button>
            </Link>
          </div>
        </motion.section>

        {/* Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard
            title="Semesters Supported"
            value="All"
            subtitle="All Sessions Supported"
            icon={GraduationCap}
            variant="primary"
            delay={0.1}
          />
          <StatCard
            title="GPA Calculation"
            value="Auto"
            subtitle="No manual entry needed"
            icon={Calculator}
            variant="success"
            delay={0.2}
          />
          <StatCard
            title="Grade Scale"
            value="4.0"
            subtitle="A+ to F grading"
            icon={Zap}
            variant="warning"
            delay={0.3}
          />
        </section>

        {/* Feature Cards */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">
            Choose Your Option
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
              >
                <Link to={feature.path}>
                  <Card className="h-full cursor-pointer card-hover hover:border-primary/50 transition-all">
                    <CardHeader>
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl bg-${feature.color}/10 text-${feature.color} mb-3`}
                      >
                        <feature.icon className="h-6 w-6" />
                      </div>
                      <CardTitle>{feature.title}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="ghost" className="gap-2 p-0 h-auto text-primary">
                        Get Started <ArrowRight className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Highlights */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">
            Why Choose This System?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {highlights.map((highlight, index) => (
              <motion.div
                key={highlight.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <Card className="h-full hover:border-primary/50 transition-all">
                  <CardHeader>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                      <highlight.icon className="h-6 w-6" />
                    </div>
                    <CardTitle>{highlight.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {highlight.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How to Calculate CGPA */}
        <section className="py-12 bg-muted/30 rounded-3xl mb-12">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
                <span className="text-sm font-medium">Simple Process</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                How to Calculate Your CGPA
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Calculate your University of Agriculture Faisalabad (UAF) CGPA instantly with our calculator designed for UAF students.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  icon: Search,
                  title: "Enter Registration",
                  description: "Input your UAF registration number (e.g., 2022-ag-7693) to fetch your official academic records instantly.",
                },
                {
                  step: "02",
                  icon: ChartColumn,
                  title: "View Breakdown",
                  description: "Get a detailed semester-wise breakdown of your marks, grades, and credit hours for every subject.",
                },
                {
                  step: "03",
                  icon: Calculator,
                  title: "Manual Calculator",
                  description: "Manually add courses and expected grades to estimate your semester GPA (GPA) before the official announcement.",
                },
                {
                  step: "04",
                  icon: Settings,
                  title: "Cumulative Projection",
                  description: "Input your previous semester's CGPA and total credits to calculate your updated cumulative success.",
                },
                {
                  step: "05",
                  icon: Users,
                  title: "Class Analysis",
                  description: "Fetch and analyze results for an entire class series to compare performance across the session.",
                },
                {
                  step: "06",
                  icon: FileSpreadsheet,
                  title: "Batch Result",
                  description: "Upload an Excel file to bulk fetch results for specific students instantly.",
                },
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-all duration-300 group hover:border-[#107561E6]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="text-4xl font-bold transition-colors"
                      style={{ color: "#107561E6" }}
                    >
                      {item.step}
                    </span>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center transition-colors">
                      <item.icon className="w-6 h-6 text-primary transition-colors" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </Layout>
  );
}
