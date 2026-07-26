// Ambient declarations for stylesheet imports the bundler resolves but TypeScript
// doesn't. Global stylesheets (NativeWind/Tailwind) are imported for their side effect
// only; CSS modules (web) default-export a class-name map.

declare module '*.css';

declare module '*.module.css' {
  const classes: { readonly [className: string]: string };
  export default classes;
}
