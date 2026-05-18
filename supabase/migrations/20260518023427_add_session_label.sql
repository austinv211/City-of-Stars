alter table public.campaigns
  add column session_label text not null default 'Session';
