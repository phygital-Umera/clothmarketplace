import {previewSalesBill, SalesPreviewPayload} from '@/lib/api/bill';
import {SalesPreview} from '@/types/bill';
import {useEffect, useState} from 'react';

/**
 * The server's view of a sales bill being typed (P4-03): the GST rate of each
 * line (D-18), the totals and the CGST/SGST or IGST split. Asked again 300 ms
 * after the last change; `pending` is true until the answer for the current
 * input arrives, so screens can show "…" instead of an old figure.
 */
const useSalesPreview = (panel: string, payload: SalesPreviewPayload | null) => {
  const [preview, setPreview] = useState<SalesPreview | null>(null);
  const [pending, setPending] = useState(false);
  const key = payload ? JSON.stringify(payload) : '';

  useEffect(() => {
    if (!payload || payload.items.length === 0) {
      setPreview(null);
      setPending(false);
      return;
    }
    setPending(true);
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      previewSalesBill(panel, payload, ctrl.signal)
        .then((p) => {
          setPreview(p);
          setPending(false);
        })
        .catch(() => {
          // Aborted by a newer change, or a line the server refuses (shown on save)
          if (!ctrl.signal.aborted) setPending(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, key]);

  return {preview, pending};
};

export default useSalesPreview;
