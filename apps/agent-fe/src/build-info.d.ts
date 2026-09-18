type BuildInfo = Readonly<{
  branch: string;
  builtAt: string;
  commit: string;
  mode: string;
}>;

declare const __BUILD_INFO__: BuildInfo;
