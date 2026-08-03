/** One portable pathname profile shared by build output and npm tar authority. */

export const PACKAGE_TAR_NAME_BYTES = 99 as const;
export const PACKAGE_TAR_ROOT_PREFIX = 'package/' as const;
export const PACKAGE_RELATIVE_PATH_BYTES =
  PACKAGE_TAR_NAME_BYTES - PACKAGE_TAR_ROOT_PREFIX.length;

/** Printable-ASCII segment accepted by npm's reviewed ustar package tree. */
export function isCanonicalPackageSegment(segment: string): boolean {
  if (
    !/^[A-Za-z0-9_@.+-]+$/u.test(segment) ||
    segment === '.' ||
    segment === '..' ||
    segment.endsWith('.')
  ) {
    return false;
  }
  const basenameBeforeDot = segment.split('.')[0]!.toUpperCase();
  return !/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/u.test(basenameBeforeDot);
}

export function isCanonicalPackageRelativePath(relative: string): boolean {
  return (
    relative.length > 0 &&
    Buffer.byteLength(relative, 'ascii') === relative.length &&
    Buffer.byteLength(`${PACKAGE_TAR_ROOT_PREFIX}${relative}`, 'ascii') <=
      PACKAGE_TAR_NAME_BYTES &&
    !relative.startsWith('/') &&
    !relative.endsWith('/') &&
    !relative.includes('\\') &&
    relative.split('/').every(isCanonicalPackageSegment)
  );
}

/** ASCII-only case fold used to reject cross-filesystem identity aliases. */
export function canonicalPackagePathCaseFold(relative: string): string {
  return relative.toUpperCase();
}
