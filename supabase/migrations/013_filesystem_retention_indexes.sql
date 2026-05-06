create index if not exists vv_files_deleted_at_idx
  on public.vv_files(deleted_at)
  where deleted_at is not null;

create index if not exists vv_files_mime_type_idx
  on public.vv_files(mime_type);

create index if not exists vv_folders_full_path_idx
  on public.vv_folders(full_path);
