-- Add foreign key constraints to student_parent_links table
ALTER TABLE public.student_parent_links
  ADD CONSTRAINT student_parent_links_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.student_parent_links
  ADD CONSTRAINT student_parent_links_parent_id_fkey 
  FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;