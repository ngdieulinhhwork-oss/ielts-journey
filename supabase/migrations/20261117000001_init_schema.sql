-- IELTS 6.5 Journey — initial schema
-- Every user-owned table carries user_id and is protected by RLS (user_id = auth.uid()).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- IELTS band check: 0..9 in 0.5 steps
create or replace function public.is_valid_band(b numeric)
returns boolean language sql immutable as $$
  select b is null or (b >= 0 and b <= 9 and (b * 2) = floor(b * 2));
$$;

-- IELTS overall rounding: average of 4 skills; .25 rounds up to .5, .75 rounds up to next whole.
create or replace function public.ielts_overall(l numeric, r numeric, w numeric, s numeric)
returns numeric language plpgsql immutable as $$
declare
  avg_score numeric;
  whole numeric;
  frac numeric;
begin
  if l is null or r is null or w is null or s is null then
    return null;
  end if;
  avg_score := (l + r + w + s) / 4.0;
  whole := floor(avg_score);
  frac := avg_score - whole;
  if frac < 0.25 then
    return whole;
  elsif frac < 0.75 then
    return whole + 0.5;
  else
    return whole + 1;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles & goals
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  target_overall numeric(2,1) not null default 6.5 check (public.is_valid_band(target_overall)),
  target_listening numeric(2,1) not null default 6.5 check (public.is_valid_band(target_listening)),
  target_reading numeric(2,1) not null default 6.5 check (public.is_valid_band(target_reading)),
  target_writing numeric(2,1) not null default 6.0 check (public.is_valid_band(target_writing)),
  target_speaking numeric(2,1) not null default 6.0 check (public.is_valid_band(target_speaking)),
  baseline_listening numeric(2,1) check (public.is_valid_band(baseline_listening)),
  baseline_reading numeric(2,1) check (public.is_valid_band(baseline_reading)),
  baseline_writing numeric(2,1) check (public.is_valid_band(baseline_writing)),
  baseline_speaking numeric(2,1) check (public.is_valid_band(baseline_speaking)),
  target_exam_date date,
  weekly_study_minutes int not null default 300 check (weekly_study_minutes between 0 and 6000),
  daily_new_words int not null default 10 check (daily_new_words between 0 and 200),
  daily_review_words int not null default 20 check (daily_review_words between 0 and 500),
  daily_study_minutes int not null default 60 check (daily_study_minutes between 0 and 600),
  preferred_study_days int[] not null default '{1,2,3,4,5}',
  weakest_skill text check (weakest_skill in ('listening','reading','writing','speaking')),
  reminder_enabled boolean not null default false,
  reminder_time time default '20:00',
  listening_conversion jsonb,
  reading_conversion jsonb,
  default_tasks_seeded boolean not null default false,
  theme text not null default 'light' check (theme in ('light','dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  skill text check (skill in ('listening','reading','writing','speaking','vocabulary','grammar','general')),
  target_band numeric(2,1) check (public.is_valid_band(target_band)),
  due_date date,
  status text not null default 'active' check (status in ('active','done','dropped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Cambridge library
-- ---------------------------------------------------------------------------
create table public.cambridge_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_number int not null check (book_number between 1 and 99),
  title text not null,
  cover_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_number)
);

create table public.cambridge_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.cambridge_books (id) on delete cascade,
  test_number int not null check (test_number between 1 and 8),
  listening_url text,
  reading_url text,
  writing_url text,
  speaking_url text,
  audio_url text,
  answer_key_url text,
  notes text,
  listening_done boolean not null default false,
  reading_done boolean not null default false,
  writing_done boolean not null default false,
  speaking_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, test_number)
);

-- ---------------------------------------------------------------------------
-- Test attempts & scores
-- ---------------------------------------------------------------------------
create table public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  test_id uuid references public.cambridge_tests (id) on delete set null,
  label text,
  attempt_date date not null default current_date,
  listening_band numeric(2,1) check (public.is_valid_band(listening_band)),
  reading_band numeric(2,1) check (public.is_valid_band(reading_band)),
  writing_band numeric(2,1) check (public.is_valid_band(writing_band)),
  speaking_band numeric(2,1) check (public.is_valid_band(speaking_band)),
  listening_source text check (listening_source in ('official','teacher','ai_estimate','practice_estimate')),
  reading_source text check (reading_source in ('official','teacher','ai_estimate','practice_estimate')),
  writing_source text check (writing_source in ('official','teacher','ai_estimate','practice_estimate')),
  speaking_source text check (speaking_source in ('official','teacher','ai_estimate','practice_estimate')),
  overall_band numeric(2,1) generated always as (public.ielts_overall(listening_band, reading_band, writing_band, speaking_band)) stored,
  duration_minutes int check (duration_minutes is null or duration_minutes between 0 and 1000),
  status text not null default 'in_progress' check (status in ('in_progress','completed','reviewed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index test_attempts_user_date_idx on public.test_attempts (user_id, attempt_date desc);
create index test_attempts_test_idx on public.test_attempts (test_id);

create table public.listening_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid references public.test_attempts (id) on delete cascade,
  test_id uuid references public.cambridge_tests (id) on delete set null,
  practice_date date not null default current_date,
  raw_score int not null check (raw_score between 0 and 40),
  estimated_band numeric(2,1) check (public.is_valid_band(estimated_band)),
  time_spent_minutes int check (time_spent_minutes is null or time_spent_minutes between 0 and 600),
  audio_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listening_results_user_idx on public.listening_results (user_id, practice_date desc);

create table public.reading_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid references public.test_attempts (id) on delete cascade,
  test_id uuid references public.cambridge_tests (id) on delete set null,
  practice_date date not null default current_date,
  raw_score int not null check (raw_score between 0 and 40),
  estimated_band numeric(2,1) check (public.is_valid_band(estimated_band)),
  time_spent_minutes int check (time_spent_minutes is null or time_spent_minutes between 0 and 600),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reading_results_user_idx on public.reading_results (user_id, practice_date desc);

create table public.score_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid references public.test_attempts (id) on delete cascade,
  skill text not null check (skill in ('listening','reading','writing','speaking','overall')),
  band numeric(2,1) not null check (public.is_valid_band(band)),
  source text check (source in ('official','teacher','ai_estimate','practice_estimate')),
  recorded_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index score_history_user_idx on public.score_history (user_id, skill, recorded_on);

-- Keep score_history in sync with attempts (one row per skill per attempt).
create or replace function public.sync_score_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.score_history where attempt_id = new.id;
  if new.listening_band is not null then
    insert into public.score_history (user_id, attempt_id, skill, band, source, recorded_on)
    values (new.user_id, new.id, 'listening', new.listening_band, new.listening_source, new.attempt_date);
  end if;
  if new.reading_band is not null then
    insert into public.score_history (user_id, attempt_id, skill, band, source, recorded_on)
    values (new.user_id, new.id, 'reading', new.reading_band, new.reading_source, new.attempt_date);
  end if;
  if new.writing_band is not null then
    insert into public.score_history (user_id, attempt_id, skill, band, source, recorded_on)
    values (new.user_id, new.id, 'writing', new.writing_band, new.writing_source, new.attempt_date);
  end if;
  if new.speaking_band is not null then
    insert into public.score_history (user_id, attempt_id, skill, band, source, recorded_on)
    values (new.user_id, new.id, 'speaking', new.speaking_band, new.speaking_source, new.attempt_date);
  end if;
  if new.overall_band is not null then
    insert into public.score_history (user_id, attempt_id, skill, band, source, recorded_on)
    values (new.user_id, new.id, 'overall', new.overall_band, null, new.attempt_date);
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Document upload & grading pipeline
-- ---------------------------------------------------------------------------
create table public.document_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  skill text not null check (skill in ('listening','reading','writing','speaking')),
  test_id uuid references public.cambridge_tests (id) on delete set null,
  writing_task int check (writing_task in (1,2)),
  status text not null default 'uploading' check (status in (
    'uploading','extracting','needs_review','confirmed','grading','graded','approved','failed')),
  error text,
  retries int not null default 0,
  grading_source text check (grading_source in ('answer_key','ai')),
  grading_options jsonb not null default '{}'::jsonb,
  result jsonb,
  attempt_id uuid references public.test_attempts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_user_idx on public.document_processing_jobs (user_id, created_at desc);

create table public.uploaded_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid references public.document_processing_jobs (id) on delete cascade,
  test_id uuid references public.cambridge_tests (id) on delete set null,
  kind text not null check (kind in ('question_paper','answer_key','user_answers','essay','speaking_audio','study_file')),
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  extracted_text text,
  extraction_method text,
  extraction_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index uploaded_documents_job_idx on public.uploaded_documents (job_id);
create index uploaded_documents_user_idx on public.uploaded_documents (user_id, created_at desc);

create table public.extracted_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null references public.document_processing_jobs (id) on delete cascade,
  question_number int not null check (question_number between 1 and 60),
  question_text text,
  question_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, question_number)
);

create table public.answer_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid references public.document_processing_jobs (id) on delete cascade,
  test_id uuid references public.cambridge_tests (id) on delete set null,
  skill text not null check (skill in ('listening','reading')),
  question_number int not null check (question_number between 1 and 60),
  accepted_answers text[] not null,
  question_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, question_number)
);

create table public.user_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null references public.document_processing_jobs (id) on delete cascade,
  question_number int not null check (question_number between 1 and 60),
  response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, question_number)
);

create table public.question_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid references public.test_attempts (id) on delete cascade,
  job_id uuid references public.document_processing_jobs (id) on delete set null,
  skill text not null check (skill in ('listening','reading')),
  question_number int not null check (question_number between 1 and 60),
  question_type text,
  user_answer text,
  correct_answer text,
  is_correct boolean not null,
  error_category text,
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index question_results_user_idx on public.question_results (user_id, skill, is_correct);
create index question_results_attempt_idx on public.question_results (attempt_id);

-- ---------------------------------------------------------------------------
-- Writing & Speaking
-- ---------------------------------------------------------------------------
create table public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_type int not null check (task_type in (1,2)),
  prompt text not null default '',
  essay text not null default '',
  word_count int not null default 0,
  time_spent_seconds int not null default 0 check (time_spent_seconds >= 0),
  status text not null default 'draft' check (status in ('draft','submitted')),
  version int not null default 1,
  parent_id uuid references public.writing_submissions (id) on delete set null,
  test_id uuid references public.cambridge_tests (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index writing_user_idx on public.writing_submissions (user_id, created_at desc);

create table public.writing_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  submission_id uuid not null references public.writing_submissions (id) on delete cascade,
  task_achievement numeric(2,1) check (public.is_valid_band(task_achievement)),
  coherence_cohesion numeric(2,1) check (public.is_valid_band(coherence_cohesion)),
  lexical_resource numeric(2,1) check (public.is_valid_band(lexical_resource)),
  grammar_accuracy numeric(2,1) check (public.is_valid_band(grammar_accuracy)),
  overall_band numeric(2,1) check (public.is_valid_band(overall_band)),
  details jsonb not null,
  model text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index writing_feedback_sub_idx on public.writing_feedback (submission_id);

create table public.speaking_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  part int not null check (part in (1,2,3)),
  topic text not null,
  question text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.speaking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  part int not null check (part in (1,2,3)),
  topic text,
  question text,
  audio_path text,
  audio_mime text,
  transcript text,
  transcript_status text not null default 'none' check (transcript_status in ('none','done','failed')),
  duration_seconds int check (duration_seconds is null or duration_seconds >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index speaking_user_idx on public.speaking_sessions (user_id, created_at desc);

create table public.speaking_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.speaking_sessions (id) on delete cascade,
  fluency_coherence numeric(2,1) check (public.is_valid_band(fluency_coherence)),
  lexical_resource numeric(2,1) check (public.is_valid_band(lexical_resource)),
  grammar_accuracy numeric(2,1) check (public.is_valid_band(grammar_accuracy)),
  pronunciation numeric(2,1) check (public.is_valid_band(pronunciation)),
  overall_band numeric(2,1) check (public.is_valid_band(overall_band)),
  pronunciation_assessed boolean not null default false,
  details jsonb not null,
  model text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Vocabulary
-- ---------------------------------------------------------------------------
create table public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  term text not null check (char_length(term) between 1 and 200),
  ipa text,
  part_of_speech text,
  meaning_vi text,
  definition_en text,
  example text,
  example_vi text,
  synonyms text[] not null default '{}',
  antonyms text[] not null default '{}',
  collocations text[] not null default '{}',
  topic text,
  cefr text check (cefr in ('A1','A2','B1','B2','C1','C2')),
  source text,
  personal_notes text,
  confidence int not null default 0 check (confidence between 0 and 5),
  is_difficult boolean not null default false,
  status text not null default 'new' check (status in ('new','learning','reviewing','mastered')),
  ease_factor numeric(4,2) not null default 2.50 check (ease_factor >= 1.30),
  interval_days int not null default 0 check (interval_days >= 0),
  repetitions int not null default 0 check (repetitions >= 0),
  lapses int not null default 0,
  first_learned_at timestamptz,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  question_result_id uuid references public.question_results (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vocabulary_user_idx on public.vocabulary (user_id, created_at desc);
create index vocabulary_due_idx on public.vocabulary (user_id, next_review_at);
create index vocabulary_status_idx on public.vocabulary (user_id, status);

create table public.vocabulary_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary (id) on delete cascade,
  quality int not null check (quality between 0 and 5),
  mode text not null check (mode in ('flashcard','multiple_choice','spelling','en_vi','vi_en')),
  previous_interval int not null,
  new_interval int not null,
  ease_factor numeric(4,2) not null,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vocabulary_reviews_user_idx on public.vocabulary_reviews (user_id, reviewed_at desc);

-- ---------------------------------------------------------------------------
-- Weakness analysis & plans (declared before tasks because tasks link to insights)
-- ---------------------------------------------------------------------------
create table public.weakness_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  rule_key text not null,
  name text not null,
  skill text not null check (skill in ('listening','reading','writing','speaking','vocabulary','planning')),
  evidence text not null,
  frequency int not null default 0,
  tests_analyzed int not null default 0,
  severity text not null check (severity in ('low','medium','high')),
  confidence text not null check (confidence in ('low','medium','high')),
  suggested_action text not null,
  ai_explanation text,
  status text not null default 'active' check (status in ('active','dismissed','resolved')),
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, rule_key)
);

create table public.recommendation_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  insight_id uuid not null references public.weakness_insights (id) on delete cascade,
  evidence_type text not null,
  ref_id uuid,
  detail text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.study_plan_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  days int not null check (days in (3,7)),
  status text not null default 'draft' check (status in ('draft','approved','discarded')),
  plan jsonb not null,
  rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Resources
-- ---------------------------------------------------------------------------
create table public.resource_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  category text not null check (category in ('listening','reading','writing','speaking','grammar','vocabulary','general')),
  channel_name text,
  channel_url text,
  video_url text,
  playlist_url text,
  notes text,
  completed boolean not null default false,
  is_huy_forum boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Planner
-- ---------------------------------------------------------------------------
create table public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  description text,
  task_date date not null default current_date,
  skill text check (skill in ('listening','reading','writing','speaking','vocabulary','grammar','general')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  duration_minutes int not null default 15 check (duration_minutes between 0 and 600),
  repeat_rule text not null default 'none' check (repeat_rule in ('none','daily','weekdays','weekly')),
  test_id uuid references public.cambridge_tests (id) on delete set null,
  vocabulary_id uuid references public.vocabulary (id) on delete set null,
  weakness_id uuid references public.weakness_insights (id) on delete set null,
  resource_id uuid references public.resource_links (id) on delete set null,
  source text not null default 'manual' check (source in ('manual','default','revision_plan')),
  plan_id uuid references public.study_plan_recommendations (id) on delete set null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index study_tasks_user_date_idx on public.study_tasks (user_id, task_date);

create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references public.study_tasks (id) on delete cascade,
  completed_on date not null,
  minutes_spent int not null default 0 check (minutes_spent between 0 and 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, completed_on)
);
create index task_completions_user_idx on public.task_completions (user_id, completed_on);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  skill text check (skill in ('listening','reading','writing','speaking','vocabulary','grammar','general')),
  activity text not null,
  minutes int not null check (minutes between 0 and 600),
  session_date date not null default current_date,
  ref_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index study_sessions_user_idx on public.study_sessions (user_id, session_date);

-- ---------------------------------------------------------------------------
-- Notes
-- ---------------------------------------------------------------------------
create table public.grammar_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  topic text,
  content text not null default '',
  status text not null default 'learning' check (status in ('learning','reviewing','mastered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.study_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  pinned boolean not null default false,
  tags text[] not null default '{}',
  linked_type text check (linked_type in ('test','question','vocabulary','writing','speaking','attempt')),
  linked_id uuid,
  linked_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index study_notes_user_idx on public.study_notes (user_id, pinned desc, updated_at desc);

-- ---------------------------------------------------------------------------
-- AI usage log (cost controls)
-- ---------------------------------------------------------------------------
create table public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text not null,
  model text not null,
  input_tokens int,
  output_tokens int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_usage_user_idx on public.ai_usage_log (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers + RLS for every table
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','learning_goals','cambridge_books','cambridge_tests','test_attempts','listening_results',
    'reading_results','score_history','document_processing_jobs','uploaded_documents','extracted_questions',
    'answer_keys','user_responses','question_results','writing_submissions','writing_feedback',
    'speaking_questions','speaking_sessions','speaking_feedback','vocabulary','vocabulary_reviews',
    'weakness_insights','recommendation_evidence','study_plan_recommendations','resource_links',
    'study_tasks','task_completions','study_sessions','grammar_notes','study_notes','ai_usage_log'
  ] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
    execute format('alter table public.%I enable row level security', t);
    if t = 'profiles' then
      execute 'create policy "own profile select" on public.profiles for select using (id = auth.uid())';
      execute 'create policy "own profile insert" on public.profiles for insert with check (id = auth.uid())';
      execute 'create policy "own profile update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid())';
    else
      execute format('create policy "own rows select" on public.%I for select using (user_id = auth.uid())', t);
      execute format('create policy "own rows insert" on public.%I for insert with check (user_id = auth.uid())', t);
      execute format('create policy "own rows update" on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
      execute format('create policy "own rows delete" on public.%I for delete using (user_id = auth.uid())', t);
    end if;
  end loop;
end;
$$;

create trigger test_attempts_score_history
after insert or update on public.test_attempts
for each row execute function public.sync_score_history();

-- Create a profile automatically for each new auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Private storage bucket: files live under "<user_id>/..."
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 26214400)
on conflict (id) do nothing;

create policy "own files read" on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files insert" on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files update" on storage.objects for update
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files delete" on storage.objects for delete
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
