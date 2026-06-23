-- ============================================================
-- Migration: Remove Jobs & Scraping Systems
-- Drops tables related to job boards, resumes, and auto-scraping
-- ============================================================

-- Drop job tables
DROP TABLE IF EXISTS public.job_applications CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;

-- Drop resume analysis and resumes
DROP TABLE IF EXISTS public.resume_analysis CASCADE;
DROP TABLE IF EXISTS public.resumes CASCADE;

-- Drop scraping/automation logs
DROP TABLE IF EXISTS public.automation_logs CASCADE;
DROP TABLE IF EXISTS public.scraping_jobs CASCADE;
