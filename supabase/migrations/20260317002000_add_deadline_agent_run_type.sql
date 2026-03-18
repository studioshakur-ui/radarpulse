do $$
begin
  alter type public.agent_run_type add value if not exists 'deadline';
exception when others then null;
end $$;
