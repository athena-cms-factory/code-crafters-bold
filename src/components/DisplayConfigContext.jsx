import React, { createContext, useContext, useState, useEffect } from 'react';

const DisplayConfigContext = createContext();

export const useDisplayConfig = () => useContext(DisplayConfigContext);

export const DisplayConfigProvider = ({ children, data }) => {
  const [config, setConfig] = useState(data.display_config || { sections: {} });

  // Update config if data changes (e.g. from Dock)
  useEffect(() => {
    if (data.display_config) {
      setConfig(data.display_config);
    }
  }, [data.display_config]);

  const isFieldVisible = (section, field) => {
    const sectionConfig = config.sections?.[section];
    if (!sectionConfig) return true;
    
    // If hidden_fields exists and contains the field, it's hidden
    if (sectionConfig.hidden_fields && sectionConfig.hidden_fields.includes(field)) {
      return false;
    }
    
    return true;
  };

  const isSectionVisible = (section) => {
    const sectionConfig = config.sections?.[section];
    if (!sectionConfig) return true;
    return sectionConfig.visible !== false;
  };

  return (
    <DisplayConfigContext.Provider value={{ config, isFieldVisible, isSectionVisible }}>
      {children}
    </DisplayConfigContext.Provider>
  );
};
