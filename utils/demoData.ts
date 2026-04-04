
import { ResumeAnalysis, TalentDensityReport } from '../types';

export const DUMMY_JD = `
Position: Senior Full Stack Engineer (React & Node.js)
Location: Remote / London
Experience: 7+ Years

Core Requirements:
- Expert proficiency in React.js, TypeScript, and modern state management (Zustand/Redux).
- Strong backend experience with Node.js, Express, and PostgreSQL.
- Proven track record of architecting scalable cloud solutions on AWS (Lambda, S3, RDS).
- Experience with CI/CD pipelines, Docker, and Kubernetes.
- Leadership experience: mentoring junior developers and leading code reviews.
- Exceptional problem-solving skills and a product-focused mindset.

Preferred:
- Experience with AI integration (OpenAI/Gemini APIs).
- Contributions to open-source projects.
`;

export const createDummyCvFiles = (): File[] => {
    const candidates = [
        // SELECT (Perfect Match)
        { name: 'Rohan Gupta', content: 'Lead Engineer with 10+ years experience, specialized in cloud architecture (AWS, Kubernetes) and CI/CD pipelines. Expert in both React and Node.js. Mentored teams of up to 8 engineers.' },
        // SELECT (Strong Fit)
        { name: 'Amit Singh', content: 'Full-stack engineer, proficient in Node.js, Express, and PostgreSQL. 8 years experience building scalable backend systems and APIs for enterprise clients. Strong skills in React and AWS Lambda.' },
        // SELECT (Strong Backend, Good React)
        { name: 'Vikram Patel', content: 'Senior Backend Engineer with 7 years experience in Node.js, PostgreSQL, and microservices architecture on AWS. Built high-traffic systems for e-commerce. Good experience with React, but primary focus is backend.' },
        // AVERAGE (Has some skills, but lacks seniority/depth)
        { name: 'Anjali Desai', content: 'Software Engineer with 4 years experience. Strong focus on UI/UX and frontend performance with React and TypeScript. Some backend experience with Node.js but primarily a frontend specialist. Familiar with Next.js.' },
        // REJECT (Too Junior)
        { name: 'Sneha Reddy', content: 'Junior developer, 1 year experience with TypeScript and React. Eager to learn and contribute to a fast-paced team. Strong fundamentals in computer science but lacks professional senior-level experience.' },
        // REJECT (Wrong Tech Stack)
        { name: 'Rajesh Kumar', content: 'Senior Python Developer with 9 years of experience building web applications with Django and Flask. Expert in data analysis with Pandas and NumPy. No experience with JavaScript, React, or Node.js.' },
    ];
    return candidates.map(c => new File([c.content], `${c.name.replace(' ', '_')}_CV.txt`, { type: 'text/plain' }));
};

export const DUMMY_COMPARISON_REPORT = `
### Candidate Comparison: Rohan Gupta vs. Amit Singh

| Feature | Rohan Gupta (96%) | Amit Singh (88%) |
|:---|:---|:---|
| **Experience** | 10+ Years (Lead) | 8 Years (Senior) |
| **Cloud** | AWS, Kubernetes, Terraform | AWS Lambda, RDS |
| **Backend** | Node.js, microservices | Node.js, PostgreSQL |
| **Frontend** | React, TypeScript | React, TypeScript |
| **Leadership** | Mentored 8+ engineers | Strong individual contributor |

**Verdict:** 
**Rohan Gupta** is the preferred choice for this specific Senior role due to his proven leadership experience and deeper mastery of infrastructure (Kubernetes). **Amit Singh** is an excellent backup with very high technical competency.
`;

export const DUMMY_OUTREACH_EMAIL = {
    subject: "Exciting Opportunity: Senior Full Stack Engineer at Smart Scout",
    body: `Hi Rohan,

I've been reviewing your background as a Lead Engineer, and I'm incredibly impressed by your 10+ years of experience, particularly your work with AWS, Kubernetes, and mentoring engineering teams.

We are currently looking for a Senior Full Stack Engineer who can help us architect scalable cloud solutions and lead modern React/Node.js development. Given your expertise, I believe you'd be a perfect fit for our mission.

Would you be open to a 15-minute introductory call later this week?

Best regards,
The Smart Scout Recruitment Team`
};

export const DUMMY_ANALYSIS_RESULTS: ResumeAnalysis[] = [
  {
    fileName: "Rohan_Gupta_CV.txt",
    candidateName: "Rohan Gupta",
    overallScore: 96,
    summary: "An almost perfect match. Rohan's extensive experience as a Lead Engineer, specializing in AWS, Kubernetes, and mentoring, aligns perfectly with all core requirements.",
    pros: ["10+ years experience", "Expert in AWS & Kubernetes", "Proven leadership and mentoring"],
    cons: ["No explicit mention of AI API integration experience."],
    breakdown: { "Relevant Experience": 98, "Technical Skills": 95, "Education": 92, "Soft Skills": 98 },
    extractedText: "Lead Engineer with 10+ years experience, specialized in cloud architecture (AWS, Kubernetes) and CI/CD pipelines. Expert in both React and Node.js. Mentored teams of up to 8 engineers."
  },
  {
    fileName: "Amit_Singh_CV.txt",
    candidateName: "Amit Singh",
    overallScore: 88,
    summary: "A strong candidate with 8 years of solid full-stack experience. Meets all core technical requirements, particularly on the backend with Node.js and PostgreSQL.",
    pros: ["Strong Node.js and PostgreSQL skills", "8 years of relevant experience", "Proficient with AWS Lambda"],
    cons: ["Leadership/mentoring experience not explicitly detailed.", "Less emphasis on modern frontend state management."],
    breakdown: { "Relevant Experience": 90, "Technical Skills": 92, "Education": 85, "Soft Skills": 85 },
    extractedText: "Full-stack engineer, proficient in Node.js, Express, and PostgreSQL. 8 years experience building scalable backend systems and APIs for enterprise clients. Strong skills in React and AWS Lambda."
  },
  {
    fileName: "Vikram_Patel_CV.txt",
    candidateName: "Vikram Patel",
    overallScore: 82,
    summary: "A highly capable backend engineer who meets core backend requirements. While proficient in React, his primary focus is clearly on server-side architecture.",
    pros: ["Deep backend expertise (Node.js, microservices)", "7 years experience", "Strong AWS background"],
    cons: ["React skills may be secondary to backend focus.", "Lacks explicit mention of CI/CD or Docker."],
    breakdown: { "Relevant Experience": 85, "Technical Skills": 88, "Education": 80, "Soft Skills": 75 },
    extractedText: "Senior Backend Engineer with 7 years experience in Node.js, PostgreSQL, and microservices architecture on AWS. Built high-traffic systems for e-commerce. Good experience with React, but primary focus is backend."
  },
  {
    fileName: "Anjali_Desai_CV.txt",
    candidateName: "Anjali Desai",
    overallScore: 55,
    summary: "A capable frontend-focused engineer who meets some criteria but lacks the required 7+ years of experience and deep backend expertise.",
    pros: ["Strong with React and TypeScript", "Good UI/UX focus"],
    cons: ["Only 4 years of experience", "Limited backend experience", "Lacks seniority for this role."],
    breakdown: { "Relevant Experience": 50, "Technical Skills": 65, "Education": 70, "Soft Skills": 70 },
    extractedText: "Software Engineer with 4 years experience. Strong focus on UI/UX and frontend performance with React and TypeScript. Some backend experience with Node.js but primarily a frontend specialist. Familiar with Next.js."
  }
];

export const DUMMY_TALENT_DENSITY_REPORT: TalentDensityReport = {
  talentDensityScore: 74,
  summary: "This is a strong talent pool with several highly qualified candidates, though quality varies significantly across the group."
};

export const DUMMY_INITIAL_CHAT_MESSAGE = "Benchmarking complete. I've analyzed 7 candidates and found a strong pool with a few top-tier prospects. I am ready to discuss the results.";
