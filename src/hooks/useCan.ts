import { useAuth } from "@/contexts/AuthContext";

export function useCan() {
  const { can } = useAuth();
  return can;
}

