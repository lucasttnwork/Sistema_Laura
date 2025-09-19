import React, { useState, useRef, useCallback } from 'react';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DragDropProps {
  onFilesSelected: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  showPreview?: boolean;
  onFileRemove?: (file: File) => void;
}

export function DragDrop({
  onFilesSelected,
  accept,
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 5,
  className,
  disabled = false,
  placeholder = 'Arraste e solte arquivos aqui ou clique para selecionar',
  showPreview = true,
  onFileRemove,
}: DragDropProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback((files: FileList): File[] => {
    const validFiles: File[] = [];
    const newErrors: string[] = [];

    // Check file count
    if (files.length > maxFiles) {
      newErrors.push(`Máximo de ${maxFiles} arquivo(s) permitido(s)`);
      return validFiles;
    }

    Array.from(files).forEach((file) => {
      // Check file size
      if (file.size > maxSize) {
        newErrors.push(`${file.name} é muito grande (máx. ${formatBytes(maxSize)})`);
        return;
      }

      // Check file type if accept is specified
      if (accept) {
        const acceptedTypes = accept.split(',').map(type => type.trim());
        const isAccepted = acceptedTypes.some(type => {
          if (type.startsWith('.')) {
            return file.name.toLowerCase().endsWith(type.toLowerCase());
          }
          return file.type.match(type.replace('*', '.*'));
        });

        if (!isAccepted) {
          newErrors.push(`${file.name} não é um tipo de arquivo válido`);
          return;
        }
      }

      validFiles.push(file);
    });

    setErrors(newErrors);
    return validFiles;
  }, [maxSize, maxFiles, accept]);

  const handleFilesSelected = useCallback((files: FileList) => {
    const validFiles = validateFiles(files);
    if (validFiles.length > 0) {
      const newFiles = multiple ? [...selectedFiles, ...validFiles] : validFiles;
      setSelectedFiles(newFiles);
      onFilesSelected(newFiles as any as FileList);
    }
  }, [validateFiles, multiple, selectedFiles, onFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFilesSelected(files);
    }
  }, [disabled, handleFilesSelected]);

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFilesSelected(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFilesSelected]);

  const handleRemoveFile = useCallback((fileToRemove: File) => {
    const newFiles = selectedFiles.filter(file => file !== fileToRemove);
    setSelectedFiles(newFiles);
    onFileRemove?.(fileToRemove);
  }, [selectedFiles, onFileRemove]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed',
          errors.length > 0 && 'border-red-500 bg-red-50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center gap-2">
          <Upload className={cn(
            'h-8 w-8',
            isDragOver ? 'text-blue-500' : 'text-gray-400',
            errors.length > 0 && 'text-red-500'
          )} />
          <div>
            <p className="text-sm font-medium text-gray-900">{placeholder}</p>
            {accept && (
              <p className="text-xs text-gray-500 mt-1">
                Tipos aceitos: {accept}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Máx. {formatBytes(maxSize)} por arquivo
            </p>
          </div>
        </div>
      </div>

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ))}
        </div>
      )}

      {/* File preview */}
      {showPreview && selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Arquivos selecionados:</h4>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <File className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                  </div>
                </div>
                {onFileRemove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(file);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    aria-label={`Remover ${file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Specialized drag drop for images
interface ImageDragDropProps extends Omit<DragDropProps, 'accept'> {
  maxWidth?: number;
  maxHeight?: number;
  onImagesSelected?: (images: { file: File; preview: string }[]) => void;
}

export function ImageDragDrop({
  onFilesSelected,
  onImagesSelected,
  maxWidth,
  maxHeight,
  ...props
}: ImageDragDropProps) {
  const [imagePreviews, setImagePreviews] = useState<{ file: File; preview: string }[]>([]);

  const handleImagesSelected = useCallback((files: FileList) => {
    onFilesSelected?.(files);

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      const previews = imageFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      setImagePreviews(prev => [...prev, ...previews]);
      onImagesSelected?.(previews);
    }
  }, [onFilesSelected, onImagesSelected]);

  const handleRemoveImage = useCallback((file: File) => {
    setImagePreviews(prev => {
      const filtered = prev.filter(item => item.file !== file);
      // Revoke object URL to prevent memory leaks
      const removed = prev.find(item => item.file === file);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      return filtered;
    });
  }, []);

  return (
    <div className="space-y-4">
      <DragDrop
        {...props}
        accept="image/*"
        onFilesSelected={handleImagesSelected}
        onFileRemove={handleRemoveImage}
      />

      {/* Image previews */}
      {imagePreviews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {imagePreviews.map(({ file, preview }, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${file.name}`}
                className="w-full h-24 object-cover rounded-lg border border-gray-200"
              />
              <button
                onClick={() => handleRemoveImage(file)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Remover ${file.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
