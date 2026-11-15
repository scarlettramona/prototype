export type NavItem = {
  // display label
  label: string;

  // identifier used by ngTreeItem [value]
  value: string;

  // everything else
  icon?: string;
  route?: string;
  children?: NavItem[];
  disabled?: boolean;
  expanded?: boolean;
};
