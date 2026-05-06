// CSS modules and global CSS imports
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

// @fontsource-variable packages ship CSS only — no TS declarations needed
declare module "@fontsource-variable/fraunces";
declare module "@fontsource-variable/fraunces/index.css";
