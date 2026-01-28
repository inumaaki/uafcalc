# UAF Calc - GPA & CGPA Manager for UAF Students 🎓

An advanced, unofficial Result Management System for the University of Agriculture Faisalabad (UAF). Built to provide a modern, fast, and responsive interface for students to check their results and calculate their GPA/CGPA with precision.

![Project Status](https://img.shields.io/badge/Status-Active-success)
[![Live Demo](https://img.shields.io/badge/Live-uafcalc.online-3b82f6)](https://uafcalc.online)
![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

*   **Instant Result Fetching:** Retrieve complete academic history using just your AG Number (e.g., `2022-ag-1234`).
*   **Accurate GPA/CGPA Calculator:** Automatically implements official UAF grading formulas (including repeat/improvement logic).
*   **Manual Simulator:** Add hypothetical courses or edit marks to simulate "What-If" scenarios for future semesters.
*   **Modern UI/UX:** Built with a beautiful, dark-mode-first design using Tailwind CSS and Shadcn UI.
*   **Mobile Responsive:** Fully optimized for seamless use on smartphones and desktop devices.
*   **Analytics Integration:** Updates with Vercel Analytics for tracking visitor trends.

## 🛠️ Technology Stack

This project uses a cutting-edge web development stack for maximum performance and developer experience:

*   **Frontend Framework:** [React 18](https://react.dev/)
*   **Build Tool:** [Vite](https://vitejs.dev/) (Flash fast HMR and optimized builds)
*   **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict type safety)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **UI Components:** [Shadcn UI](https://ui.shadcn.com/) (based on Radix Primitives)
*   **State Management:** [TanStack Query](https://tanstack.com/query/latest) (React Query)
*   **Routing:** React Router DOM v6
*   **Data Scraping:** Custom Node.js Scraper with [Cheerio](https://cheerio.js.org/)

## 🏗️ Architecture & How it Works

Since UAF does not provide a public API, extracting data requires a specialized approach:

1.  **Proxy Server:** A secure Vercel Serverless Function (`/api/proxy`) acts as an intermediary.
2.  **Session Handling:** The proxy automates the login handshake with the LMS to retrieve secure tokens (CSRF) and session cookies.
3.  **HTML Parsing:** It fetches the raw HTML result pages from the university server and uses **Cheerio** to parse the DOM, extracting marks and course details into clean JSON.
4.  **Client-Side Logic:** The React frontend receives this JSON and runs GPA calculation algorithms locally to ensure instant feedback without re-fetching.

## 🚀 Getting Started

Follow these steps to run the project locally on your machine.

### Prerequisites
*   Node.js (v18 or higher)
*   npm or bun

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/inumaaki/uafcalc.git

# 2. Navigate to directory
cd uafcalc

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

The app should now be running at `http://localhost:8080`.

## 🤝 Contributing

Contributions are welcome! If you'd like to improve the GPA formulation or add new features:

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📝 License

This project is open-source and available under the **MIT License**.

---
*Note: This is an unofficial tool and is not affiliated with the University of Agriculture Faisalabad.*
