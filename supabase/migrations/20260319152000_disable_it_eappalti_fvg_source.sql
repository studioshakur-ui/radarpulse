update public.sources
set
  is_active = false,
  last_error = 'Disabled: eAppaltiFVG public listing still returns 401 Unauthorized from worker runtime',
  updated_at = now()
where key = 'it_eappalti_fvg_active';
