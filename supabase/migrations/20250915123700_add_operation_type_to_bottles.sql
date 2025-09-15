-- Add operation_type column to bottles table
alter table public.bottles 
add column if not exists operation_type text 
not null 
default 'add' 
check (operation_type in ('add', 'clear'));

-- Update existing rows to have default operation_type
update public.bottles 
set operation_type = 'add' 
where operation_type is null;

-- Add an index for better query performance
create index if not exists idx_bottles_operation_type on public.bottles(operation_type);
