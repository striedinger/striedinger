declare module "gifsicle-wasm-browser" {
  interface GifsicleOutput extends Blob {
    name: string;
  }

  const gifsicle: {
    run(options: {
      command: string[];
      input: Array<{ file: Blob; name: string }>;
    }): Promise<GifsicleOutput[]>;
  };

  export default gifsicle;
}
