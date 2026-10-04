declare module "marzipano" {
  // marzipano ships no type definitions; consumers narrow the objects they use.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Marzipano: any;
  export = Marzipano;
}
