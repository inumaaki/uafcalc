import { Link } from "react-router-dom";
import { GraduationCap, Github, Linkedin, Mail, Heart } from "lucide-react";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-primary text-primary-foreground mt-auto">
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-6">
                    {/* Brand Column */}
                    <div className="md:col-span-1">
                        <Link to="/" className="flex items-center gap-2 mb-4">
                            <div className="h-8 w-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center border border-primary-foreground/20">
                                <GraduationCap className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <span className="font-bold text-lg">UAF Result Hub</span>
                        </Link>
                        <p className="text-sm text-primary-foreground/80 leading-relaxed mb-4">
                            A comprehensive result management system designed specifically for University of Agriculture, Faisalabad students to track their academic progress.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="font-semibold text-primary-foreground mb-4">Quick Links</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link to="/" className="text-primary-foreground/80 hover:text-white transition-colors">
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link to="/smart-search" className="text-primary-foreground/80 hover:text-white transition-colors">
                                    Smart Search
                                </Link>
                            </li>
                            <li>
                                <Link to="/individual" className="text-primary-foreground/80 hover:text-white transition-colors">
                                    Individual Result
                                </Link>
                            </li>
                            <li>
                                <Link to="/class" className="text-primary-foreground/80 hover:text-white transition-colors">
                                    Class Result
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h3 className="font-semibold text-primary-foreground mb-4">Support</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link to="/contact" className="text-primary-foreground/80 hover:text-white transition-colors">
                                    Report a Bug
                                </Link>
                            </li>
                            <li>
                                <Link to="/contact" className="text-primary-foreground/80 hover:text-white transition-colors">
                                    Feature Request
                                </Link>
                            </li>
                            <li>
                                <a
                                    href="http://www.uaf.edu.pk/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary-foreground/80 hover:text-white transition-colors"
                                >
                                    UAF Official Site
                                </a>
                            </li>
                            <li>
                                <Link to="/privacy-policy" className="text-primary-foreground/80 hover:text-white transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal / Social */}
                    <div>
                        <h3 className="font-semibold text-primary-foreground mb-4">Connect</h3>
                        <div className="flex gap-4 mb-4">
                            <a href="https://github.com/inumaaki" target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-full bg-primary-foreground/10 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground hover:text-primary transition-colors border border-primary-foreground/20">
                                <Github className="h-4 w-4" />
                            </a>
                            <a href="https://www.linkedin.com/in/mhassanraza117/" target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-full bg-primary-foreground/10 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground hover:text-primary transition-colors border border-primary-foreground/20">
                                <Linkedin className="h-4 w-4" />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="border-t border-primary-foreground/10 pt-6 flex justify-center text-xs text-primary-foreground/60">
                    <p>Built by <a href="https://www.linkedin.com/in/mhassanraza117/" target="_blank" rel="noopener noreferrer" className="text-white hover:underline font-medium">Muhammad Hassan Raza</a> • © {currentYear} All Rights Reserved</p>
                </div>
            </div>
        </footer>
    );
}
