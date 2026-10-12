/** JSON content is bundled by esbuild; its shape is checked by the content loaders, not by the type checker. */
declare module "*.json" {
  const value: unknown;
  export default value;
}
