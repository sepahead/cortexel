import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Isolated qualification controls use deterministic mocks and deny real child APIs.
interface FixtureStat {
  dev: bigint;
  ino: bigint;
  mode: bigint;
  uid: bigint;
  gid: bigint;
  nlink: bigint;
  size: bigint;
  mtimeNs: bigint;
  ctimeNs: bigint;
  birthtimeNs: bigint;
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
}
const mock = vi.hoisted(() => ({
  lstatSync: vi.fn(), fstatSync: vi.fn(), openSync: vi.fn(),
  closeSync: vi.fn(), readSync: vi.fn(), realpathSync: vi.fn(),
  spawnSync: vi.fn(), constants: {} as Record<string, number>,
}));
vi.mock('node:child_process', () => ({ spawnSync: mock.spawnSync }));
vi.mock('node:fs', async (importOriginal) => {
  const fs = await importOriginal<typeof import('node:fs')>();
  mock.constants = { ...fs.constants };
  return {
    ...fs, constants: mock.constants, lstatSync: mock.lstatSync,
    fstatSync: mock.fstatSync, openSync: mock.openSync,
    closeSync: mock.closeSync, readSync: mock.readSync,
    realpathSync: mock.realpathSync,
  };
});
import { requireReviewedPosixAclAuthority } from '../scripts/lib/posix-acl-authority';

const physical = '/Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework/Versions/3.9/bin/python3.9';
const inspector = fileURLToPath(new URL('../scripts/inspect-posix-acl.py', import.meta.url));
const helper = readFileSync(inspector);
const platformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform')!;
const subjects = [
  { kind: 'path' as const, label: 'reviewed Node path', value: '/reviewed/runtime/node' },
  { kind: 'descriptor' as const, label: 'reviewed Node descriptor', value: 17 },
];
const parentPaths: string[] = [];
for (let cursor = dirname(physical);; cursor = dirname(cursor)) {
  parentPaths.push(cursor);
  if (cursor === '/') break;
}
parentPaths.reverse();
let entries: Map<string, FixtureStat>;
let handles: Map<number, { path: string; stat: FixtureStat }>;
let opened: number[];
let nextDescriptor: number;
let nextInode: bigint;
let originalConstants: Record<string, number>;
function stat(kind: 'file' | 'directory' | 'symlink' | 'other', fields: Partial<FixtureStat> = {}): FixtureStat {
  return {
    dev: 1n, ino: nextInode++, mode: kind === 'directory' ? 0o40755n : 0o100755n,
    uid: 0n, gid: 0n, nlink: kind === 'directory' ? 2n : 1n,
    size: kind === 'directory' ? 256n : 102352n,
    mtimeNs: 1n, ctimeNs: 1n, birthtimeNs: 1n,
    isFile: () => kind === 'file', isDirectory: () => kind === 'directory',
    isSymbolicLink: () => kind === 'symlink', ...fields,
  };
}
function setPlatform(value: unknown): void {
  Object.defineProperty(process, 'platform', { configurable: true, value });
}
function completeReturn() {
  return { status: 0, signal: null, stdout: '', stderr: '', error: undefined };
}
function call(): void { requireReviewedPosixAclAuthority(subjects); }
function allOpenedClosedOnce(): void {
  const closed = mock.closeSync.mock.calls.map(([fd]) => fd);
  expect(closed.slice().sort((a, b) => a - b)).toEqual(opened.slice().sort((a, b) => a - b));
  expect(new Set(closed).size).toBe(closed.length);
}
function accepted(executable = physical): void {
  expect(call).not.toThrow();
  expect(mock.spawnSync).toHaveBeenCalledTimes(1);
  const [actualExecutable, args, options] = mock.spawnSync.mock.calls[0]!;
  expect(actualExecutable).toBe(executable);
  expect(args).toEqual(['-I', '-B', '-S', '-', '--path', 'reviewed Node path', '/reviewed/runtime/node', '--fd', 'reviewed Node descriptor', '3']);
  expect(options).toEqual({ encoding: 'utf8', env: { LANG: 'C', LC_ALL: 'C', PATH: '/usr/bin:/bin' }, input: helper, maxBuffer: 64 * 1024, stdio: ['pipe', 'pipe', 'pipe', 17], timeout: 10_000 });
  allOpenedClosedOnce();
}
function refusedBeforeDispatch(): void {
  expect(call).toThrow();
  expect(mock.spawnSync).not.toHaveBeenCalled();
  allOpenedClosedOnce();
}
beforeEach(() => {
  if (!originalConstants) originalConstants = { ...mock.constants };
  Object.assign(mock.constants, originalConstants);
  for (const fn of [mock.lstatSync, mock.fstatSync, mock.openSync, mock.closeSync, mock.readSync, mock.realpathSync, mock.spawnSync]) fn.mockReset();
  entries = new Map(); handles = new Map(); opened = []; nextDescriptor = 40; nextInode = 100n;
  setPlatform('darwin');
  for (const path of parentPaths) entries.set(path, stat('directory'));
  entries.set(physical, stat('file'));
  entries.set(inspector, stat('file', { size: BigInt(helper.length), mode: 0o100644n }));
  mock.lstatSync.mockImplementation((path: string) => {
    const entry = entries.get(path); if (!entry) throw new Error('Synthetic missing entry'); return entry;
  });
  mock.realpathSync.mockImplementation((path: string) => path);
  mock.openSync.mockImplementation((path: string) => {
    const entry = entries.get(path); if (!entry) throw new Error('Synthetic missing entry');
    const fd = nextDescriptor++; opened.push(fd); handles.set(fd, { path, stat: { ...entry } }); return fd;
  });
  mock.fstatSync.mockImplementation((fd: number) => {
    const entry = handles.get(fd); if (!entry) throw new Error('Synthetic unknown descriptor'); return entry.stat;
  });
  mock.closeSync.mockImplementation((fd: number) => { if (!handles.delete(fd)) throw new Error('Synthetic duplicate close'); });
  mock.readSync.mockImplementation((fd: number, destination: Buffer, offset: number, length: number, position: number) => {
    if (handles.get(fd)?.path !== inspector) throw new Error('Unexpected fixture byte read');
    const part = helper.subarray(position, Math.min(helper.length, position + length));
    part.copy(destination, offset); return part.length;
  });
  mock.spawnSync.mockImplementation(completeReturn);
});
afterEach(() => { Object.defineProperty(process, 'platform', platformDescriptor); vi.unstubAllEnvs(); });

describe('fixed OS ACL Python prerequisite — deterministic mocks only', () => {
  it('CTP01 retains exact Darwin child protocol and complete physical ancestry', () => {
    accepted();
    expect(mock.openSync.mock.calls.map(([path]) => path)).toEqual([inspector, ...parentPaths, physical]);
    for (const [path, flags] of mock.openSync.mock.calls) {
      expect(flags & mock.constants.O_NOFOLLOW!).not.toBe(0);
      expect(flags & mock.constants.O_NONBLOCK!).not.toBe(0);
      if (parentPaths.includes(path)) expect(flags & mock.constants.O_DIRECTORY!).not.toBe(0);
    }
  });
  it('CTP02 ignores ambient interpreter selection variables', () => {
    vi.stubEnv('PYTHON', '/unreviewed/python'); vi.stubEnv('ACL_INSPECTOR_PYTHON', '/usr/bin/python3');
    accepted();
  });
  it('CTP03 preserves the explicit Linux prerequisite without CLT acquisition', () => {
    setPlatform('linux'); accepted('/usr/bin/python3');
    expect(mock.openSync.mock.calls.map(([path]) => path)).toEqual([inspector]);
  });
  it.each(['freebsd', 'Darwin', '', null, []])('CTP04 refuses unsupported profile selector %j', (platform) => {
    setPlatform(platform); refusedBeforeDispatch();
  });
  it.each(['directory', 'symlink', 'other'] as const)('CTP05 refuses non-regular physical leaf %s', (kind) => {
    entries.set(physical, stat(kind)); refusedBeforeDispatch();
  });
  it.each([['leaf UID', physical, { uid: 501n }], ['leaf GID', physical, { gid: 80n }], ['ancestor UID', '/Library', { uid: 501n }], ['ancestor GID', '/Library', { gid: 80n }]] as const)('CTP06 refuses %s', (_label, path, change) => {
    entries.set(path, { ...entries.get(path)!, ...change }); refusedBeforeDispatch();
  });
  it.each([0o100775n, 0o100757n, 0o104755n, 0o102755n, 0o101755n, 0o100644n])('CTP07 refuses writable/special/non-executable leaf %s', (mode) => {
    entries.set(physical, { ...entries.get(physical)!, mode }); refusedBeforeDispatch();
  });
  it('CTP08 refuses an ancestor writable without protected OS profile modes', () => {
    entries.set('/Library', { ...entries.get('/Library')!, mode: 0o40775n }); refusedBeforeDispatch();
  });
  it.each(['/', '/Library/Developer', physical])('CTP09 refuses missing required path %s', (path) => {
    entries.delete(path); refusedBeforeDispatch();
  });
  it.each(['/Library', physical])('CTP10 refuses unresolved alias at %s', (path) => {
    mock.realpathSync.mockImplementation((candidate: string) => candidate === path ? '/unreviewed/alias' : candidate);
    refusedBeforeDispatch();
  });
  it('CTP11 refuses replacement while opening and closes every acquired descriptor', () => {
    const ordinary = mock.fstatSync.getMockImplementation()!;
    mock.fstatSync.mockImplementation((fd: number) => {
      const value = ordinary(fd);
      return handles.get(fd)?.path === physical ? { ...value, ino: value.ino + 1n } : value;
    });
    refusedBeforeDispatch();
  });
  it('CTP12 refuses path replacement after one complete mocked return', () => {
    mock.spawnSync.mockImplementation(() => {
      entries.set(physical, { ...entries.get(physical)!, ino: 999n }); return completeReturn();
    });
    expect(call).toThrow(); expect(mock.spawnSync).toHaveBeenCalledTimes(1); allOpenedClosedOnce();
  });
  it('CTP13 refuses descriptor authority change after one complete mocked return', () => {
    mock.spawnSync.mockImplementation(() => {
      for (const record of handles.values()) if (record.path === physical) record.stat = { ...record.stat, ctimeNs: 2n };
      return completeReturn();
    });
    expect(call).toThrow(); expect(mock.spawnSync).toHaveBeenCalledTimes(1); allOpenedClosedOnce();
  });
  it.each([
    ['zero extent', { size: 0n }],
    ['extent above 64 MiB', { size: 64n * 1024n * 1024n + 1n }],
    ['multiple hard links', { nlink: 2n }],
  ] as const)('CTP14 refuses leaf extent/link authority: %s', (_label, change) => {
    entries.set(physical, { ...entries.get(physical)!, ...change }); refusedBeforeDispatch();
  });
  it.each([{ status: 1 }, { status: null }, { status: '0' }, { signal: 'SIGTERM' }, { signal: undefined }, { stdout: 'unexpected' }, { stdout: undefined }, { stderr: 'python3: warning: confstr() failed' }, { stderr: undefined }, { error: new Error('Synthetic native error') }])('CTP15 preserves strict refusal for nonempty/unknown native result %j', (change) => {
    mock.spawnSync.mockImplementation(() => ({ ...completeReturn(), ...change }));
    expect(call).toThrow(); expect(mock.spawnSync).toHaveBeenCalledTimes(1); allOpenedClosedOnce();
  });
  it('CTP16 refuses a spawn exception without retry and closes all owned descriptors', () => {
    mock.spawnSync.mockImplementation(() => { throw new Error('Synthetic spawn failure'); });
    expect(call).toThrow(); expect(mock.spawnSync).toHaveBeenCalledTimes(1); allOpenedClosedOnce();
  });
  it('CTP17 refuses close uncertainty without a second close or dispatch', () => {
    mock.closeSync.mockImplementation((fd: number) => {
      const record = handles.get(fd); handles.delete(fd);
      if (record?.path === physical) throw new Error('Synthetic close uncertainty');
    });
    expect(call).toThrow(); expect(mock.spawnSync).toHaveBeenCalledTimes(1); allOpenedClosedOnce();
  });
  it.each(['O_DIRECTORY', 'O_NOFOLLOW', 'O_NONBLOCK'])('CTP18 refuses unavailable opened-path primitive %s', (name) => {
    mock.constants[name] = 0; refusedBeforeDispatch();
  });
  it.each([1n, 64n * 1024n * 1024n])('CTP19 permits only the declared finite extent boundary %s', (size) => {
    entries.set(physical, { ...entries.get(physical)!, size }); accepted();
  });
  it.each(['/Library/Developer', physical])('CTP20 closes partial acquisition when opening %s fails', (path) => {
    const ordinary = mock.openSync.getMockImplementation()!;
    mock.openSync.mockImplementation((candidate: string, flags: number) => {
      if (candidate === path) throw new Error('Synthetic open failure'); return ordinary(candidate, flags);
    });
    refusedBeforeDispatch();
  });
  it('CTP21 closes the newly opened leaf when descriptor inspection throws', () => {
    const ordinary = mock.fstatSync.getMockImplementation()!;
    mock.fstatSync.mockImplementation((fd: number) => {
      if (handles.get(fd)?.path === physical) throw new Error('Synthetic descriptor failure'); return ordinary(fd);
    });
    refusedBeforeDispatch();
  });
  it('CTP22 refuses identity drift in the complete pre-dispatch recheck', () => {
    const ordinary = mock.fstatSync.getMockImplementation()!; let leafReads = 0;
    mock.fstatSync.mockImplementation((fd: number) => {
      const value = ordinary(fd);
      if (handles.get(fd)?.path === physical && ++leafReads > 1) return { ...value, ctimeNs: 2n };
      return value;
    });
    refusedBeforeDispatch();
  });
});
