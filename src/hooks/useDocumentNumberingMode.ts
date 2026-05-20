import { useEffect, useState } from "react";
import { documentNumberingAPI } from "@/services/api";

export function useDocumentNumberingMode(documentName?: string) {
  const [loading, setLoading] = useState(true);
  const [isManualNumbering, setIsManualNumbering] = useState(false);

  useEffect(() => {
    let active = true;

    const loadMode = async () => {
      if (!documentName) {
        if (active) {
          setIsManualNumbering(false);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const response = await documentNumberingAPI.getAll(undefined, true);
        const records = Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : [];

        const hasActiveConfiguration = records.some(
          (record: any) =>
            record?.documentName === documentName && record?.isActive !== false,
        );

        if (active) {
          setIsManualNumbering(!hasActiveConfiguration);
        }
      } catch (error) {
        console.error(`Failed to load document numbering mode for ${documentName}:`, error);
        if (active) {
          setIsManualNumbering(false);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadMode();

    return () => {
      active = false;
    };
  }, [documentName]);

  return { isManualNumbering, loading };
}
