-- ============================================================
-- LearnLoom Migration 00018 — Database Schema & Data Fixes: Role Enum Split
-- ============================================================

-- 1. Update profiles table default for role column to 'student'
-- Originally it was 'user' (from migration 00001), but we want it to be 'student' now
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'student'::public.user_role;

-- 2. Update existing profiles using the legacy 'user' role to 'student'
-- This ensures stats queries (e.g. total_students counting role='student') count them correctly
UPDATE public.profiles SET role = 'student'::public.user_role WHERE role = 'user'::public.user_role;
