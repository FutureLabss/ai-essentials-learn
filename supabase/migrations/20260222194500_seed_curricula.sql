-- Seed Courses
INSERT INTO public.courses (id, name, description, duration_weeks)
VALUES 
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'AI Essentials', 'A 6-week intensive designed to turn non-technical learners into AI-powered professionals. Focus on practical outcomes, income generation, and extreme productivity.', 6),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Digital Essentials', 'Master the fundamentals of the digital world with AI as your personal tutor. Learn internet safety, productivity tools, and how to stay ahead in the modern economy.', 6)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  duration_weeks = EXCLUDED.duration_weeks;

-- Seed Weeks for AI Essentials
INSERT INTO public.weeks (id, course_id, week_number, title)
VALUES 
('ai-w1', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 1, 'AI Strategy and Tooling'),
('ai-w2', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2, 'Content Engineering & Authority'),
('ai-w3', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 3, 'Visual Identity & Branding'),
('ai-w4', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 4, 'Web Presence & Launching'),
('ai-w5', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 5, 'Operational Efficiency & Automation'),
('ai-w6', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 6, 'Capstone: Professional Launch')
ON CONFLICT (id) DO UPDATE SET 
  week_number = EXCLUDED.week_number,
  title = EXCLUDED.title;

-- Seed Lessons for AI Essentials
INSERT INTO public.lessons (id, week_id, lesson_number, title, learning_objective, content, practical_task)
VALUES 
('ai-w1-l1', 'ai-w1', 1, 'The Professional AI Mindset', 'Shift from using AI as a toy to using it as a professional strategic partner.', 'In this lesson, we explore the paradigm shift required to excel in an AI-driven economy. We move beyond simple prompts to understanding AI as a ''second brain'' and a capability multiplier. You will learn the ''Human-in-the-loop'' framework for professional accuracy.', 'Audit your current daily workflow and identify 3 tasks where AI can save you at least 30 minutes each. Document the potential impact on your productivity.'),
('ai-w1-l2', 'ai-w1', 2, 'Setting Up Your AI Tech Stack', 'Configure a professional workspace with the right AI tools for maximum efficiency.', 'We compare top-tier models (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro) and set up specialized environments. You''ll learn how to organize your AI workspace to minimize friction in your daily work.', 'Create a ''Master Tool List'' for your specific industry. Set up accounts for at least two pro-level AI models and configure your initial project workspace.'),
('ai-w2-l1', 'ai-w2', 1, 'Advanced Content Architectures', 'Create high-authority long-form content and strategic messaging using AI-driven research.', 'Learn to build complex content frameworks rather than single posts. We cover ''Recursive Prompting'' for deep research and how to maintain a consistent professional voice throughout multiple content pieces.', 'Choose a niche topic and use AI to build a 4-part thought leadership series outline. Include research points and target audience pain points for each.'),
('ai-w3-l1', 'ai-w3', 1, 'Professional Visual Design with AI', 'Design consistent, high-end brand assets without traditional design training.', 'Master Midjourney, Canva Magic Studio, and other visual AI tools to create professional logos, social media headers, and marketing materials. Focus on color theory and brand consistency across AI-generated assets.', 'Generate a complete visual identity kit for a hypothetical small business, including a logo, brand colors, and 3 promotional graphics.'),
('ai-w4-l1', 'ai-w4', 1, 'Building AI-Driven Sites Fast', 'Deploy functional, beautiful landing pages in hours rather than weeks.', 'Leverage AI website builders and code assistants to create your professional portfolio or business landing page. We focus on conversion-centric design and SEO optimization using AI analysis.', 'Draft the copy and layout for a high-converting landing page using AI. Include headlines, social proof sections, and a clear call to action.'),
('ai-w5-l1', 'ai-w5', 1, 'Building No-Code AI Workflows', 'Automate repetitive business processes using AI and zero code.', 'Introduction to automating workflows using AI as the ''brain''. We look at connecting tools like Zapier or Make with AI to handle lead generation, data entry, and customer responses automatically.', 'Design an automated customer inquiry workflow. Map out how an incoming email is analyzed by AI and converted into a task in your project management system.'),
('ai-w6-l1', 'ai-w6', 1, 'Your 90-Day AI Roadmap', 'Finalize your professional offering and create a sustainable growth plan.', 'The final week focuses on commercializing your new skills. You will package your AI-enhanced services, set pricing, and create a lead generation plan for your first clients or a promotion at work.', 'Create a detailed 90-day action plan for your career launch. This must include your target income goals, daily AI habits, and your specific high-value service offering.')
ON CONFLICT (id) DO UPDATE SET 
  lesson_number = EXCLUDED.lesson_number,
  title = EXCLUDED.title,
  learning_objective = EXCLUDED.learning_objective,
  content = EXCLUDED.content,
  practical_task = EXCLUDED.practical_task;

-- Seed Weeks for Digital Essentials
INSERT INTO public.weeks (id, course_id, week_number, title)
VALUES 
('de-w1', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 1, 'Digital & Internet Fundamentals'),
('de-w2', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 2, 'Productivity & Work Tools'),
('de-w3', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 3, 'Social Media & Digital Presence'),
('de-w4', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 4, 'Data & Analysis Basics'),
('de-w5', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 5, 'AI for Everyday Work'),
('de-w6', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 6, 'Career Pathways & AI Advantage')
ON CONFLICT (id) DO UPDATE SET 
  week_number = EXCLUDED.week_number,
  title = EXCLUDED.title;

-- Seed Lessons for Digital Essentials
INSERT INTO public.lessons (id, week_id, lesson_number, title, learning_objective, content, practical_task, video_url)
VALUES 
('de-w1-l1', 'de-w1', 1, 'Introduction to Internet & Online Safety', 'Understand internet basics and how to stay safe online.', 'Learn how the internet works, the importance of strong passwords, and how to spot common online scams. We''ll use AI to help explain complex technical concepts in simple terms.', 'Ask AI: ''Explain what the internet is in simple English, using Nigerian examples.'' Then rewrite it in your own words.', 'https://www.youtube.com/watch?v=6LELzf4cG2w'),
('de-w1-l2', 'de-w1', 2, 'AI & Digital Literacy Foundations', 'Understand what AI is and how it fits into your digital life.', 'Explore the core components of AI literacy: Awareness, Capability, Knowledge, and Critical Thinking. Learn why ''AI output is never final until a human reviews it.''', 'Use an AI chat tool to translate a technical term into your local language. Critically review if the translation makes sense.', 'https://www.youtube.com/watch?v=XM68f6GS8yQ'),
('de-w2-l1', 'de-w2', 1, 'Practical AI at Work', 'Use AI to speed up drafting emails, documents, and reports.', 'See how AI can act as your writing partner for work-quality outputs. We explore workflows for instant wins like email drafting and meeting summaries.', 'After watching the email workflow example, draft a rough email for an internship search and ask AI to rewrite it for professional tone.', 'https://www.youtube.com/watch?v=RKzm-K6JFUc'),
('de-w3-l1', 'de-w3', 1, 'AI as a Content Coach', 'Use AI to generate ideas and refine your messaging on social media.', 'Learn how to use AI for content ideas and caption improvement. Focus on clarity and engagement for your professional or personal brand.', 'Ask AI: ''Give 10 Instagram/WhatsApp status ideas for a tech-savvvy fashion brand in Nigeria.'' Rewrite one in 3 different tones.', 'https://www.youtube.com/watch?v=zkXonmqIBFg'),
('de-w4-l1', 'de-w4', 1, 'Reading Simple Data with AI', 'Use AI to explain and suggest insights from simple data tables.', 'Learn how to use AI as a checker and explainer for data. We focus on critical thinking and awareness of AI limitations when handling numbers.', 'Feed a small table (like a grocery list or survey) to AI and ask for ''3 insights and 2 possible mistakes in interpretation.''', 'https://www.youtube.com/watch?v=XM68f6GS8yQ'),
('de-w5-l1', 'de-w5', 1, 'Delegation & Judgment Week', 'Decompose complex tasks into AI-friendly steps and use red-teaming for safety.', 'Master AI workflows as ''digital assistants''. Learn to take a real task and write it as a step-by-step AI instruction.', 'Take a real task (like planning a community event) and write step-by-step AI instructions. Ask AI for 5 ways the plan could fail in Nigeria.', 'https://www.youtube.com/watch?v=OA4UP4O1hz0'),
('de-w6-l1', 'de-w6', 1, 'AI as Your Career Accelerator', 'Use AI for career exploration, CV optimization, and learning plans.', 'The final week explores why AI literacy matters for your long-term career advantage. Learn to build learning plans and interview prep guides.', 'Ask AI: ''Given that I live in Nigeria and have these skills [list them], suggest 3 realistic digital career paths and a 90-day learning plan for one.''', 'https://www.youtube.com/watch?v=oVy8qbd6i-U')
ON CONFLICT (id) DO UPDATE SET 
  lesson_number = EXCLUDED.lesson_number,
  title = EXCLUDED.title,
  learning_objective = EXCLUDED.learning_objective,
  content = EXCLUDED.content,
  practical_task = EXCLUDED.practical_task,
  video_url = EXCLUDED.video_url;
