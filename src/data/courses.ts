export interface Lesson {
    id: string;
    title: string;
    lesson_number: number;
    learning_objective?: string;
    content: string;
    practical_task?: string;
    video_url?: string;
}

export interface Week {
    id: string;
    week_number: number;
    title: string;
    lessons: Lesson[];
}

export interface Course {
    id: string;
    name: string;
    description: string;
    duration_weeks: number;
    weeks: Week[];
}

export const aiEssentialsCourse: Course = {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    name: "AI Essentials",
    description: "A 6-week intensive designed to turn non-technical learners into AI-powered professionals. Focus on practical outcomes, income generation, and extreme productivity.",
    duration_weeks: 6,
    weeks: [
        {
            id: "w1",
            week_number: 1,
            title: "AI Strategy and Tooling",
            lessons: [
                {
                    id: "w1-l1",
                    lesson_number: 1,
                    title: "The Professional AI Mindset",
                    learning_objective: "Shift from using AI as a toy to using it as a professional strategic partner.",
                    content: "In this lesson, we explore the paradigm shift required to excel in an AI-driven economy. We move beyond simple prompts to understanding AI as a 'second brain' and a capability multiplier. You will learn the 'Human-in-the-loop' framework for professional accuracy.",
                    practical_task: "Audit your current daily workflow and identify 3 tasks where AI can save you at least 30 minutes each. Document the potential impact on your productivity."
                },
                {
                    id: "w1-l2",
                    lesson_number: 2,
                    title: "Setting Up Your AI Tech Stack",
                    learning_objective: "Configure a professional workspace with the right AI tools for maximum efficiency.",
                    content: "We compare top-tier models (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro) and set up specialized environments. You'll learn how to organize your AI workspace to minimize friction in your daily work.",
                    practical_task: "Create a 'Master Tool List' for your specific industry. Set up accounts for at least two pro-level AI models and configure your initial project workspace."
                }
            ]
        },
        {
            id: "w2",
            week_number: 2,
            title: "Content Engineering & Authority",
            lessons: [
                {
                    id: "w2-l1",
                    lesson_number: 1,
                    title: "Advanced Content Architectures",
                    learning_objective: "Create high-authority long-form content and strategic messaging using AI-driven research.",
                    content: "Learn to build complex content frameworks rather than single posts. We cover 'Recursive Prompting' for deep research and how to maintain a consistent professional voice throughout multiple content pieces.",
                    practical_task: "Choose a niche topic and use AI to build a 4-part thought leadership series outline. Include research points and target audience pain points for each."
                }
            ]
        },
        {
            id: "w3",
            week_number: 3,
            title: "Visual Identity & Branding",
            lessons: [
                {
                    id: "w3-l1",
                    lesson_number: 1,
                    title: "Professional Visual Design with AI",
                    learning_objective: "Design consistent, high-end brand assets without traditional design training.",
                    content: "Master Midjourney, Canva Magic Studio, and other visual AI tools to create professional logos, social media headers, and marketing materials. Focus on color theory and brand consistency across AI-generated assets.",
                    practical_task: "Generate a complete visual identity kit for a hypothetical small business, including a logo, brand colors, and 3 promotional graphics."
                }
            ]
        },
        {
            id: "w4",
            week_number: 4,
            title: "Web Presence & Launching",
            lessons: [
                {
                    id: "w4-l1",
                    lesson_number: 1,
                    title: "Building AI-Driven Sites Fast",
                    learning_objective: "Deploy functional, beautiful landing pages in hours rather than weeks.",
                    content: "Leverage AI website builders and code assistants to create your professional portfolio or business landing page. We focus on conversion-centric design and SEO optimization using AI analysis.",
                    practical_task: "Draft the copy and layout for a high-converting landing page using AI. Include headlines, social proof sections, and a clear call to action."
                }
            ]
        },
        {
            id: "w5",
            week_number: 5,
            title: "Operational Efficiency & Automation",
            lessons: [
                {
                    id: "w5-l1",
                    lesson_number: 1,
                    title: "Building No-Code AI Workflows",
                    learning_objective: "Automate repetitive business processes using AI and zero code.",
                    content: "Introduction to automating workflows using AI as the 'brain'. We look at connecting tools like Zapier or Make with AI to handle lead generation, data entry, and customer responses automatically.",
                    practical_task: "Design an automated customer inquiry workflow. Map out how an incoming email is analyzed by AI and converted into a task in your project management system."
                }
            ]
        },
        {
            id: "w6",
            week_number: 6,
            title: "Capstone: Professional Launch",
            lessons: [
                {
                    id: "w6-l1",
                    lesson_number: 1,
                    title: "Your 90-Day AI Roadmap",
                    learning_objective: "Finalize your professional offering and create a sustainable growth plan.",
                    content: "The final week focuses on commercializing your new skills. You will package your AI-enhanced services, set pricing, and create a lead generation plan for your first clients or a promotion at work.",
                    practical_task: "Create a detailed 90-day action plan for your career launch. This must include your target income goals, daily AI habits, and your specific high-value service offering."
                }
            ]
        }
    ]
};

export const digitalEssentialsCourse: Course = {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    name: "Digital Essentials",
    description: "Master the fundamentals of the digital world with AI as your personal tutor. Learn internet safety, productivity tools, and how to stay ahead in the modern economy.",
    duration_weeks: 6,
    weeks: [
        {
            id: "dw1",
            week_number: 1,
            title: "Digital & Internet Fundamentals",
            lessons: [
                {
                    id: "dw1-l1",
                    lesson_number: 1,
                    title: "Introduction to Internet & Online Safety",
                    learning_objective: "Understand internet basics and how to stay safe online.",
                    content: "Learn how the internet works, the importance of strong passwords, and how to spot common online scams. We'll use AI to help explain complex technical concepts in simple terms.",
                    practical_task: "Ask AI: 'Explain what the internet is in simple English, using Nigerian examples.' Then rewrite it in your own words.",
                    video_url: "https://www.youtube.com/watch?v=6LELzf4cG2w"
                },
                {
                    id: "dw1-l2",
                    lesson_number: 2,
                    title: "AI & Digital Literacy Foundations",
                    learning_objective: "Understand what AI is and how it fits into your digital life.",
                    content: "Explore the core components of AI literacy: Awareness, Capability, Knowledge, and Critical Thinking. Learn why 'AI output is never final until a human reviews it.'",
                    practical_task: "Use an AI chat tool to translate a technical term into your local language. Critically review if the translation makes sense.",
                    video_url: "https://www.youtube.com/watch?v=XM68f6GS8yQ"
                }
            ]
        },
        {
            id: "dw2",
            week_number: 2,
            title: "Productivity & Work Tools",
            lessons: [
                {
                    id: "dw2-l1",
                    lesson_number: 1,
                    title: "Practical AI at Work",
                    learning_objective: "Use AI to speed up drafting emails, documents, and reports.",
                    content: "See how AI can act as your writing partner for work-quality outputs. We explore workflows for instant wins like email drafting and meeting summaries.",
                    practical_task: "After watching the email workflow example, draft a rough email for an internship search and ask AI to rewrite it for professional tone.",
                    video_url: "https://www.youtube.com/watch?v=RKzm-K6JFUc"
                }
            ]
        },
        {
            id: "dw3",
            week_number: 3,
            title: "Social Media & Digital Presence",
            lessons: [
                {
                    id: "dw3-l1",
                    lesson_number: 1,
                    title: "AI as a Content Coach",
                    learning_objective: "Use AI to generate ideas and refine your messaging on social media.",
                    content: "Learn how to use AI for content ideas and caption improvement. Focus on clarity and engagement for your professional or personal brand.",
                    practical_task: "Ask AI: 'Give 10 Instagram/WhatsApp status ideas for a tech-savvvy fashion brand in Nigeria.' Rewrite one in 3 different tones.",
                    video_url: "https://www.youtube.com/watch?v=zkXonmqIBFg"
                }
            ]
        },
        {
            id: "dw4",
            week_number: 4,
            title: "Data & Analysis Basics",
            lessons: [
                {
                    id: "dw4-l1",
                    lesson_number: 1,
                    title: "Reading Simple Data with AI",
                    learning_objective: "Use AI to explain and suggest insights from simple data tables.",
                    content: "Learn how to use AI as a checker and explainer for data. We focus on critical thinking and awareness of AI limitations when handling numbers.",
                    practical_task: "Feed a small table (like a grocery list or survey) to AI and ask for '3 insights and 2 possible mistakes in interpretation.'",
                    video_url: "https://www.youtube.com/watch?v=XM68f6GS8yQ"
                }
            ]
        },
        {
            id: "dw5",
            week_number: 5,
            title: "AI for Everyday Work",
            lessons: [
                {
                    id: "dw5-l1",
                    lesson_number: 1,
                    title: "Delegation & Judgment Week",
                    learning_objective: "Decompose complex tasks into AI-friendly steps and use red-teaming for safety.",
                    content: "Master AI workflows as 'digital assistants'. Learn to take a real task and write it as a step-by-step AI instruction.",
                    practical_task: "Take a real task (like planning a community event) and write step-by-step AI instructions. Ask AI for 5 ways the plan could fail in Nigeria.",
                    video_url: "https://www.youtube.com/watch?v=OA4UP4O1hz0"
                }
            ]
        },
        {
            id: "dw6",
            week_number: 6,
            title: "Career Pathways & AI Advantage",
            lessons: [
                {
                    id: "dw6-l1",
                    lesson_number: 1,
                    title: "AI as Your Career Accelerator",
                    learning_objective: "Use AI for career exploration, CV optimization, and learning plans.",
                    content: "The final week explores why AI literacy matters for your long-term career advantage. Learn to build learning plans and interview prep guides.",
                    practical_task: "Ask AI: 'Given that I live in Nigeria and have these skills [list them], suggest 3 realistic digital career paths and a 90-day learning plan for one.'",
                    video_url: "https://www.youtube.com/watch?v=oVy8qbd6i-U"
                }
            ]
        }
    ]
};

export const allCourses = [aiEssentialsCourse, digitalEssentialsCourse];
