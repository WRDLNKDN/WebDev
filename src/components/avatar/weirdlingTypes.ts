export interface WeirdlingResponse {
  status: string;
  prediction: {
    output: string[];
    status: string;
  };
  names: string[];
  debug_prompt: string;
}
