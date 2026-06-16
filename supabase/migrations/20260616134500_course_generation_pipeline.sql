-- Add course generation status flow to existing courses table
ALTER TABLE courses
ADD COLUMN generation_status TEXT DEFAULT 'PUBLISHED' CHECK (generation_status IN ('CRAWLED', 'HUMANIZED', 'COURSE_GENERATED', 'READY_FOR_REVIEW', 'APPROVED', 'PUBLISHED')),
ADD COLUMN originality_score NUMERIC DEFAULT 0,
ADD COLUMN source_urls TEXT[] DEFAULT '{}',
ADD COLUMN references_list TEXT[] DEFAULT '{}';

-- Create an index to quickly filter courses needing review
CREATE INDEX idx_courses_generation_status ON courses(generation_status);
