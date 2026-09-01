import React, { useState } from "react";
import SearchableSelect from "./SearchableSelect";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
}

const Select: React.FC<SelectProps> = ({
  options,
  placeholder = "Select an option",
  onChange,
  className = "",
  defaultValue = "",
}) => {
  // Manage the selected value
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue);

  const handleChange = (value: string) => {
    setSelectedValue(value);
    onChange(value); // Trigger parent handler
  };

  return (
    <div className={className}>
      <SearchableSelect
        value={selectedValue}
        onChange={(value) => handleChange(value || "")}
        options={options}
        placeholder={placeholder}
        isClearable={false}
      />
    </div>
  );
};

export default Select;
