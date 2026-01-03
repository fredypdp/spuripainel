import React from "react";
import { Icon } from "@iconify/react";

interface IconsProps {
  icon: string;
  className?: string;
  width?: number | string;
}

const Icons: React.FC<IconsProps> = ({
  icon,
  className,
  width,
}) => {
  return (
    <Icon
      icon={icon}
      className={className}
      width={width}
    />
  );
};

export default Icons;