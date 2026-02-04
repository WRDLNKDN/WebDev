export interface PortfolioItem {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  project_url: string | null;
  tech_stack: string[];
  created_at: string;
}

export type NewProject = {
  title: string;
  description: string;
  image_url: string;
  project_url: string;
  tech_stack: string[];
};
