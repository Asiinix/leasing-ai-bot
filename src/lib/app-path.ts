/** Prefix explicit fetch and asset URLs when this build lives below a subpath. */
export function appPath(path: `/${string}`) {
  return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${path}`;
}
