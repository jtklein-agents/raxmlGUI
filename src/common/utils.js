export const is = {
  macos: process.platform === 'darwin',
  linux: process.platform === 'linux',
  windows: process.platform === 'win32',
  development: process.env.NODE_ENV === 'development',
};
export const platform = ( object ) => {
  let platformKey = process.platform;
  if ( is.macos ) {
    platformKey = 'macos';
  } else if ( is.windows ) {
    platformKey = 'windows';
  }
  const fn = platformKey in object
    ? object[platformKey]
    : object.default;
  return typeof fn === 'function'
    ? fn()
    : fn;
};
export const quote = ( dir ) => ( is.windows
  ? `"${dir}"`
  : dir );
