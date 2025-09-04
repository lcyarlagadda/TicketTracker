// components/Atoms/FileUpload.tsx
import React, { useRef, useState } from 'react';
import { Upload, File, X } from 'lucide-react';

interface FileUploadProps {
  multiple?: boolean;
  accept?: string[];
  maxSizeMB?: number;
  uploadLabel?: string;
  onFilesSelected?: (files: File | File[]) => void;
  onFileUpload?: (file: File) => void;
  fileType?: string[];
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  multiple = false,
  accept = [],
  maxSizeMB = 5,
  uploadLabel = 'Upload Files',
  onFilesSelected,
  onFileUpload,
  fileType = [],
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      // Check file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`File ${file.name} is too large. Max size is ${maxSizeMB}MB.`);
        return false;
      }

      // Check file type
      const acceptedTypes = fileType.length > 0 ? fileType : accept;
      if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
        alert(`File ${file.name} is not an accepted file type.`);
        return false;
      }

      return true;
    });

    if (validFiles.length > 0) {
      setSelectedFiles(prev => multiple ? [...prev, ...validFiles] : validFiles);
      
      if (onFilesSelected) {
        onFilesSelected(multiple ? validFiles : validFiles[0]);
      }
      
      if (onFileUpload && !multiple) {
        onFileUpload(validFiles[0]);
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={32} className="mx-auto mb-4 text-slate-400" />
        <p className="text-slate-700 font-medium mb-2">{uploadLabel}</p>
        <p className="text-sm text-slate-500">
          Click to browse or drag and drop files here
        </p>
        <p className="text-xs text-slate-400 mt-2">
          Max file size: {maxSizeMB}MB
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={[...accept, ...fileType].join(',')}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-700">Selected Files:</h4>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
            >
              <div className="flex items-center gap-3">
                <File size={16} className="text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="p-1 rounded-full hover:bg-red-100 text-red-500 hover:text-red-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;