import React from 'react';

const Logo = ({ className = "", size = "md" }) => {
  const sizes = {
    sm: "h-12 w-auto",
    md: "h-45 w-auto",
    lg: "h-40 w-auto",
    xl: "h-48 w-auto"
  };

  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src="/logo-serra-felix.png" 
        alt="Serra do Félix - Material de Construção" 
        className={sizes[size]}
      />
    </div>
  );
};

export default Logo;
