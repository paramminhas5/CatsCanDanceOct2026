/**
 * TypeScript declarations for static asset imports.
 * Next.js handles these via webpack loaders — this tells TS they're valid.
 */

declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}

declare module "*.jpeg" {
  const content: string;
  export default content;
}

declare module "*.gif" {
  const content: string;
  export default content;
}

declare module "*.webp" {
  const content: string;
  export default content;
}

declare module "*.ico" {
  const content: string;
  export default content;
}

declare module "*.mp3" {
  const content: string;
  export default content;
}

declare module "*.mp4" {
  const content: string;
  export default content;
}
