import React, { useState } from 'react';

interface CropImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

const CropImage: React.FC<CropImageProps> = ({ 
  src, 
  alt, 
  className = "w-full h-48 object-cover",
  fallbackSrc 
}) => {
  const [imgSrc, setImgSrc] = useState(src);

  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError && fallbackSrc) {
      setImgSrc(fallbackSrc);
      setHasError(true);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
};

export default CropImage; 