import React from 'react';
import { useSystem } from '../../contexts/SystemContext';

const Logo = ({ className = "", size = "md" }) => {
  const sizes = {
    sm: "h-12 w-auto",
    md: "h-44 w-auto",
    lg: "h-40 w-auto",
    large: "h-40 w-auto",
    xl: "h-48 w-auto"
  };

  const { activeSystem } = useSystem();

  const src = activeSystem?.logo ?? '/logo-serra-felix.png';
  const alt = activeSystem?.logoAlt ?? 'Serra do Félix - Material de Construção';

  return (
    <div className={`flex items-center ${className}`}>
      <img
        src={src}
        alt={alt}
        className={sizes[size]}
      />
    </div>
  );
};

export default Logo;
