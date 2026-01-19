import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Globe, Shield, BookOpen, Lock, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
    return (
        <Layout>
            <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                <div className="text-center mb-12 animate-fadeInUp">
                    <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
                    <p className="text-muted-foreground">How we handle and protect your information</p>
                </div>

                <div className="space-y-6">
                    {/* Data Scraping Consent */}
                    <Card className="animate-fadeIn shadow-lg">
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <Globe className="w-6 h-6 text-primary" />
                            </div>
                            <CardTitle className="text-xl font-semibold">Data Scraping Consent</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">By accepting this privacy policy, you explicitly consent to:</p>
                            <ul className="list-disc list-inside ml-4 mt-2 text-muted-foreground">
                                <li>Allowing our service to fetch your academic records from the UAF website</li>
                                <li>Automated retrieval and processing of your academic data</li>
                                <li>Temporary access to your academic information for CGPA calculation</li>
                            </ul>
                            <div className="mt-4 text-sm bg-primary/5 p-4 rounded-lg text-muted-foreground">
                                <p>Note: This process is automated and secure. We only access publicly available academic records using your provided registration number, similar to how you would view them on the UAF portal.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Information Collection */}
                    <Card className="animate-fadeIn shadow-lg">
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <Shield className="w-6 h-6 text-primary" />
                            </div>
                            <CardTitle className="text-xl font-semibold">Information Collection</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-muted-foreground">
                            <p>We only collect and process your registration number to fetch academic results from the UAF portal. This data is:</p>
                            <ul className="list-disc list-inside ml-4 mt-2">
                                <li>Used solely for retrieving your academic records</li>
                                <li>Not stored on our servers</li>
                                <li>Processed in real-time</li>
                                <li>Handled with strict confidentiality</li>
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Data Usage */}
                    <Card className="animate-fadeIn shadow-lg">
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <BookOpen className="w-6 h-6 text-primary" />
                            </div>
                            <CardTitle className="text-xl font-semibold">Data Usage</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-muted-foreground">
                            <p>Your information is used exclusively for:</p>
                            <ul className="list-disc list-inside ml-4 mt-2">
                                <li>Calculating your CGPA</li>
                                <li>Displaying semester-wise results</li>
                                <li>Providing academic performance analysis</li>
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Data Protection */}
                    <Card className="animate-fadeIn shadow-lg">
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <Lock className="w-6 h-6 text-primary" />
                            </div>
                            <CardTitle className="text-xl font-semibold">Data Protection</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-muted-foreground">
                            <p>We implement robust security measures to protect your information:</p>
                            <ul className="list-disc list-inside ml-4 mt-2">
                                <li>No permanent storage of academic records</li>
                                <li>Secure, real-time data processing</li>
                                <li>No sharing with third parties</li>
                                <li>End-to-end secure connections</li>
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Contact Us */}
                    <Card className="animate-fadeIn shadow-lg">
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <Mail className="w-6 h-6 text-primary" />
                            </div>
                            <CardTitle className="text-xl font-semibold">Contact Us</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-muted-foreground">
                            <p>For any privacy concerns or questions, please reach out to us via our contact page:</p>
                            <div className="mt-2 text-primary font-medium hover:underline">
                                <Link to="/contact">Go to Contact Page</Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Layout>
    );
}
