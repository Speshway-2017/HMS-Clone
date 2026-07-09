import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

interface ReportEntry {
  _id: string;
  type: string;
  format: string;
  rowCount: number;
  generatedBy: { name: string };
  createdAt: string;
}

interface ReportCategory {
  type: string;
  label: string;
  count: number;
}

export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const res = await api.get("/reports");
      return res.data.data as { reports: ReportEntry[]; categories: ReportCategory[] };
    },
  });
}

export function useExportReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (type: string) => {
      const res = await api.get(`/reports/export/${type}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${type}-export.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  });
}
