-- Update Course Descriptions
UPDATE public.courses 
SET description = 'Master the fundamentals of the digital world with AI as your personal tutor. Learn internet safety, productivity tools, and how to stay ahead in the modern economy.'
WHERE id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

-- Update Digital Essentials Lessons (Content, Tasks, Videos)
-- Week 1
UPDATE public.lessons SET 
  title = 'Introduction to Internet & Online Safety',
  learning_objective = 'Understand internet basics and how to stay safe online.',
  content = 'Learn how the internet works, the importance of strong passwords, and how to spot common online scams. Use AI to help explain complex technical concepts in simple terms.',
  practical_task = 'Ask AI: ''Explain what the internet is in simple English, using Nigerian examples.'' Then rewrite it in your own words.',
  video_url = 'https://www.youtube.com/watch?v=6LELzf4cG2w'
WHERE id = 'de-w1-l1';

UPDATE public.lessons SET 
  title = 'AI & Digital Literacy Foundations',
  learning_objective = 'Understand what AI is and how it fits into your digital life.',
  content = 'Explore the core components of AI literacy: Awareness, Capability, Knowledge, and Critical Thinking. Remember: AI output is never final until a human reviews it.',
  practical_task = 'Use an AI tool to translate a technical term into your local language. Critically review if the translation makes sense.',
  video_url = 'https://www.youtube.com/watch?v=XM68f6GS8yQ'
WHERE id = 'de-w1-l2';

-- Week 2
UPDATE public.lessons SET 
  title = 'Practical AI at Work',
  learning_objective = 'Use AI to speed up drafting emails, documents, and reports.',
  content = 'See how AI can act as your writing partner for work-quality outputs. Explore workflows for instant wins like email drafting and meeting summaries.',
  practical_task = 'Draft a rough email for an internship search and ask AI to rewrite it for a professional tone.',
  video_url = 'https://www.youtube.com/watch?v=RKzm-K6JFUc'
WHERE id = 'de-w2-l1';

-- Week 3
UPDATE public.lessons SET 
  title = 'AI as a Content Coach',
  learning_objective = 'Use AI to generate ideas and refine your messaging on social media.',
  content = 'Learn how to use AI for content ideas and caption improvement. Focus on clarity and engagement for your professional brand.',
  practical_task = 'Ask AI: ''Give 10 WhatsApp status ideas for a tech-savvy business in Nigeria.'' Rewrite one in 3 different tones.',
  video_url = 'https://www.youtube.com/watch?v=zkXonmqIBFg'
WHERE id = 'de-w3-l1';

-- Week 4
UPDATE public.lessons SET 
  title = 'Reading Simple Data with AI',
  learning_objective = 'Use AI to explain and suggest insights from simple data tables.',
  content = 'Learn how to use AI as a checker and explainer for data. Focus on critical thinking and checking assumptions.',
  practical_task = 'Feed a small table to AI and ask for ''3 insights and 2 possible mistakes in interpretation.''',
  video_url = 'https://www.youtube.com/watch?v=XM68f6GS8yQ'
WHERE id = 'de-w4-l1';

-- Week 5
UPDATE public.lessons SET 
  title = 'Delegation & Judgment Week',
  learning_objective = 'Decompose complex tasks into AI-friendly steps and use red-teaming for safety.',
  content = 'Master AI workflows as digital assistants. Learn to take a real task and write it as a step-by-step instruction.',
  practical_task = 'Take a task (like event planning) and write AI instructions. Ask AI for 5 ways the plan could fail in Nigeria.',
  video_url = 'https://www.youtube.com/watch?v=OA4UP4O1hz0'
WHERE id = 'de-w5-l1';

-- Week 6
UPDATE public.lessons SET 
  title = 'AI as Your Career Accelerator',
  learning_objective = 'Use AI for career exploration, CV optimization, and learning plans.',
  content = 'Explore why AI literacy matters for your long-term career. Learn to build learning plans and interview prep guides.',
  practical_task = 'Ask AI to suggest 3 digital career paths in Nigeria based on your skills, and create a 90-day learning plan.',
  video_url = 'https://www.youtube.com/watch?v=oVy8qbd6i-U'
WHERE id = 'de-w6-l1';
