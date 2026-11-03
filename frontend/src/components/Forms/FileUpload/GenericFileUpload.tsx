import {checkFile, IMAGE_RULE} from '@/lib/validation/fieldRules';
import {ImagePlus, Trash2, Upload} from 'lucide-react';
import {DragEvent, useEffect, useId, useRef, useState} from 'react';

type GenericFileUploadProps = {
  label: string;
  /** File picked in this session */
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** URL already saved on the server (edit forms) */
  existingUrl?: string | null;
  onRemoveExisting?: () => void;
  required?: boolean;
  /** Error from the form / backend, shown under the box */
  error?: string;
  /** Allowed types and size; images (PNG/JPG/WEBP/SVG, 2 MB) by default */
  rule?: {mimeTypes: string[]; maxBytes: number; hint: string};
};

/** Drag-and-drop image picker with preview, type and size check */
const GenericFileUpload = ({
  label,
  file,
  onFileChange,
  existingUrl,
  onRemoveExisting,
  required,
  error: externalError,
  rule = IMAGE_RULE,
}: GenericFileUploadProps) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return setPreviewUrl(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (picked?: File) => {
    if (!picked) return;
    const problem = checkFile(picked, label, rule);
    setError(problem);
    if (!problem) onFileChange(picked);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    pick(e.dataTransfer.files?.[0]);
  };

  const shown = previewUrl ?? existingUrl ?? null;
  const message = error || externalError;

  const clear = () => {
    setError('');
    if (file) onFileChange(null);
    else onRemoveExisting?.();
  };

  return (
    <div>
      <span className="field-label">
        {label}
        {required && (
          <span className="ml-1 text-burgundy" aria-hidden="true">
            *
          </span>
        )}
      </span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`relative flex aspect-square w-full flex-col items-center justify-center gap-2 border border-dashed p-4 text-center transition-colors ${
          isDragging
            ? 'border-burgundy bg-blush/20'
            : message
              ? 'border-error bg-ivory-100'
              : 'border-ivory-300 bg-ivory-100 hover:border-burgundy/50'
        }`}
      >
        {shown ? (
          <img
            src={shown}
            alt={`${label} preview`}
            className="h-full w-full object-contain"
          />
        ) : (
          <>
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline bg-white text-burgundy">
              <ImagePlus size={20} strokeWidth={1.5} />
            </span>
            <p className="text-body-sm text-espresso">
              Drag an image here, or{' '}
              <label
                htmlFor={inputId}
                className="cursor-pointer text-burgundy underline underline-offset-4"
              >
                browse
              </label>
            </p>
            <p className="text-technical-data text-outline">{rule.hint}</p>
          </>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={rule.mimeTypes.join(',')}
          aria-label={label}
          aria-invalid={!!message}
          aria-describedby={message ? `${inputId}-error` : undefined}
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>

      {shown && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <label htmlFor={inputId} className="btn-text cursor-pointer">
            <Upload size={12} /> Replace
          </label>
          <button type="button" onClick={clear} className="btn-text text-error">
            <Trash2 size={12} /> Remove
          </button>
        </div>
      )}
      {message && (
        <p id={`${inputId}-error`} role="alert" className="field-error">
          {message}
        </p>
      )}
    </div>
  );
};

export default GenericFileUpload;
