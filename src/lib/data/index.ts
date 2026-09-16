/** Picks the repository: Supabase (Lovable Cloud) when configured, else the browser. */
import { createLocalRepository } from "@/lib/data/local";
import { createSupabaseRepository, supabaseConfig } from "@/lib/data/supabase";
import type { Repository } from "@/lib/data/types";

let repository: Repository | null = null;

export function getRepository(): Repository {
  if (!repository) {
    const config = supabaseConfig();
    repository = config ? createSupabaseRepository(config) : createLocalRepository();
  }
  return repository;
}
