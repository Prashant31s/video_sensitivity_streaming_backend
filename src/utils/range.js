export function parseRange(rangeHeader, fileSize) {
  if (!rangeHeader?.startsWith("bytes=")) {
    return null;
  }

  const [startToken, endToken] = rangeHeader.replace("bytes=", "").split("-");
  const start = startToken ? Number(startToken) : 0;
  const end = endToken ? Number(endToken) : fileSize - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= fileSize) {
    return null;
  }

  return { start, end };
}
